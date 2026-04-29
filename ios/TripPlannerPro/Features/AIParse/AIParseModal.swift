import SwiftUI
import FirebaseAuth
import FirebaseStorage
import UniformTypeIdentifiers

// MARK: - EditableParsedItem
// Wraps ParsedItem with a stable UUID so that editing fields that affect
// ParsedItem.id (flightNumber, departureLocalTime, etc.) does not break
// the selectedItems set or the firstIndex lookup.

struct EditableParsedItem: Identifiable, Sendable {
    let id: UUID
    var item: ParsedItem

    init(item: ParsedItem) {
        self.id = UUID()
        self.item = item
    }
}

// MARK: -

enum ParseMode: String, CaseIterable {
    case chat = "Chat"
    case file = "Archivo"
    case manual = "Manual"

    var icon: String {
        switch self {
        case .chat: return "sparkles"
        case .file: return "doc.fill"
        case .manual: return "pencil"
        }
    }
}

struct AIParseModal: View {
    let trip: Trip
    var prefillText: String = ""

    @Environment(FirestoreClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @AppStorage("aiProvider") private var storedProvider: String = AIProvider.claude.rawValue
    @State private var mode: ParseMode = .chat
    @State private var inputText = ""
    @State private var provider: AIProvider = .claude
    @State private var parseState: ParseState = .idle
    @State private var selectedItems: Set<UUID> = []
    @State private var editingItem: EditableParsedItem? = nil
    @State private var selectedFileData: Data? = nil
    @State private var selectedFileName: String = ""
    @State private var showFilePicker = false

    enum ParseState {
        case idle
        case parsing
        case preview([EditableParsedItem])
        case error(String)
        case saved
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                VStack(spacing: 0) {
                    modeSelector
                    Divider().background(Tokens.Color.border)

                    switch parseState {
                    case .idle:
                        inputArea
                    case .parsing:
                        parsingState
                    case .preview(let items):
                        previewArea(items)
                    case .error(let msg):
                        errorState(msg)
                    case .saved:
                        savedState
                    }
                }
            }
            .navigationTitle("Cargar con IA")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                if !prefillText.isEmpty && inputText.isEmpty {
                    inputText = prefillText
                }
                // Respect the user's saved AI provider preference from Settings
                if let saved = AIProvider(rawValue: storedProvider) {
                    provider = saved
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") { dismiss() }
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
                if case .preview(let editables) = parseState {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Guardar \(selectedItems.count)") {
                            saveSelected(editables)
                        }
                        .disabled(selectedItems.isEmpty)
                        .foregroundStyle(selectedItems.isEmpty ? Tokens.Color.textTertiary : Tokens.Color.accentBlue)
                    }
                }
            }
        }
        .sheet(item: $editingItem) { editable in
            ParsedItemEditSheet(editable: editable) { updated in
                if case .preview(var editables) = parseState {
                    if let idx = editables.firstIndex(where: { $0.id == updated.id }) {
                        editables[idx] = updated
                    }
                    parseState = .preview(editables)
                }
                editingItem = nil
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Mode Selector

    private var modeSelector: some View {
        HStack(spacing: 0) {
            ForEach(ParseMode.allCases, id: \.self) { m in
                Button {
                    withAnimation(.easeInOut(duration: Tokens.Motion.fast)) { mode = m }
                } label: {
                    HStack(spacing: Tokens.Spacing.xs) {
                        Image(systemName: m.icon)
                            .font(.system(size: 13))
                        Text(m.rawValue)
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundStyle(mode == m ? Tokens.Color.accentPurple : Tokens.Color.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Tokens.Spacing.md)
                    .overlay(alignment: .bottom) {
                        if mode == m {
                            Rectangle().fill(Tokens.Color.accentPurple).frame(height: 2)
                        }
                    }
                }
            }
        }
        .background(Tokens.Color.surface)
    }

    // MARK: - Input Area

    private var inputArea: some View {
        ScrollView {
            VStack(spacing: Tokens.Spacing.md) {
                if mode == .chat {
                    chatInput
                } else if mode == .file {
                    fileInput
                } else {
                    ManualItemsView(trip: trip)
                }
            }
            .padding(Tokens.Spacing.base)
        }
        .fileImporter(
            isPresented: $showFilePicker,
            allowedContentTypes: [.image, .pdf],
            allowsMultipleSelection: false
        ) { result in
            guard case .success(let urls) = result, let url = urls.first else { return }
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            selectedFileData = try? Data(contentsOf: url)
            selectedFileName = url.lastPathComponent
        }
    }

    private var chatInput: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
            VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
                Text("Pegá el email de tu reserva")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Tokens.Color.textSecondary)
                Text("Funciona con vuelos, hoteles y transportes.")
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.elevated)
                    .frame(minHeight: 160)

                if inputText.isEmpty {
                    Text("Ej: Tu vuelo IB6844 EZE→MAD sale el 15 de marzo a las 21:35...")
                        .font(.system(size: 14))
                        .foregroundStyle(Tokens.Color.textTertiary)
                        .padding(Tokens.Spacing.md)
                }

                TextEditor(text: $inputText)
                    .font(.system(size: 14))
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .scrollContentBackground(.hidden)
                    .background(.clear)
                    .frame(minHeight: 160)
                    .padding(Tokens.Spacing.sm)
            }

            HStack {
                providerPicker
                Spacer()
                Button {
                    Task { await runParse() }
                } label: {
                    HStack(spacing: Tokens.Spacing.xs) {
                        Image(systemName: "sparkles")
                        Text("Parsear")
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, Tokens.Spacing.base)
                    .padding(.vertical, Tokens.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .fill(inputText.isEmpty ? Tokens.Color.textTertiary : Tokens.Color.accentPurple)
                    )
                }
                .disabled(inputText.isEmpty)
            }
        }
    }

    private var fileInput: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
            VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
                Text("Subí un PDF o imagen")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Tokens.Color.textSecondary)
                Text("Funciona con confirmaciones de reserva, e-tickets y PDFs de itinerario.")
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }

            Button {
                showFilePicker = true
            } label: {
                HStack(spacing: Tokens.Spacing.sm) {
                    Image(systemName: selectedFileData != nil ? "doc.fill" : "arrow.up.doc")
                        .font(.system(size: 16))
                        .foregroundStyle(selectedFileData != nil ? Tokens.Color.accentPurple : Tokens.Color.textSecondary)
                    Text(selectedFileData != nil ? selectedFileName : "Seleccionar archivo")
                        .font(.system(size: 14))
                        .foregroundStyle(selectedFileData != nil ? Tokens.Color.textPrimary : Tokens.Color.textSecondary)
                        .lineLimit(1)
                    Spacer()
                    if selectedFileData != nil {
                        Button {
                            selectedFileData = nil
                            selectedFileName = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(Tokens.Color.textTertiary)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(Tokens.Spacing.md)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .fill(Tokens.Color.elevated)
                        .overlay(
                            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                .strokeBorder(
                                    selectedFileData != nil ? Tokens.Color.accentPurple.opacity(0.4) : Tokens.Color.border,
                                    lineWidth: 1
                                )
                        )
                )
            }
            .buttonStyle(.plain)

            HStack {
                providerPicker
                Spacer()
                Button {
                    Task { await runParseFile() }
                } label: {
                    HStack(spacing: Tokens.Spacing.xs) {
                        Image(systemName: "sparkles")
                        Text("Parsear")
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, Tokens.Spacing.base)
                    .padding(.vertical, Tokens.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .fill(selectedFileData == nil ? Tokens.Color.textTertiary : Tokens.Color.accentPurple)
                    )
                }
                .disabled(selectedFileData == nil)
            }
        }
    }

    private var providerPicker: some View {
        Menu {
            ForEach(AIProvider.allCases, id: \.self) { p in
                Button {
                    provider = p
                } label: {
                    Label(p.label, systemImage: provider == p ? "checkmark" : "")
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "cpu")
                    .font(.system(size: 12))
                Text(provider.label)
                    .font(.system(size: 13))
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 10))
            }
            .foregroundStyle(Tokens.Color.textSecondary)
            .padding(.horizontal, Tokens.Spacing.sm)
            .padding(.vertical, Tokens.Spacing.xs)
            .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.elevated))
        }
    }

    // MARK: - Parsing State

    private var parsingState: some View {
        VStack(spacing: Tokens.Spacing.md) {
            Spacer()
            Image(systemName: "sparkles")
                .font(.system(size: 32))
                .foregroundStyle(Tokens.Color.accentPurple)
                .symbolEffect(.pulse)
            Text("Analizando con \(provider.label)...")
                .font(.system(size: 15))
                .foregroundStyle(Tokens.Color.textSecondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Preview

    private func previewArea(_ editables: [EditableParsedItem]) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
                HStack {
                    Text("Se encontraron \(editables.count) items")
                        .font(.system(size: 13))
                        .foregroundStyle(Tokens.Color.textSecondary)
                    Spacer()
                    Button {
                        if selectedItems.count == editables.count {
                            selectedItems.removeAll()
                        } else {
                            selectedItems = Set(editables.map(\.id))
                        }
                    } label: {
                        Text(selectedItems.count == editables.count ? "Deseleccionar todo" : "Seleccionar todo")
                            .font(.system(size: 13))
                            .foregroundStyle(Tokens.Color.accentBlue)
                    }
                }

                ForEach(editables) { editable in
                    ParsedItemCard(
                        item: editable.item,
                        isSelected: selectedItems.contains(editable.id),
                        onToggle: {
                            if selectedItems.contains(editable.id) {
                                selectedItems.remove(editable.id)
                            } else {
                                selectedItems.insert(editable.id)
                            }
                        },
                        onEdit: {
                            editingItem = editable
                        }
                    )
                }
            }
            .padding(Tokens.Spacing.base)
        }
        .background(Tokens.Color.bgPrimary)
    }

    // MARK: - Error / Saved States

    private func errorState(_ msg: String) -> some View {
        VStack(spacing: Tokens.Spacing.md) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 32))
                .foregroundStyle(Tokens.Color.accentRed)
            Text(msg)
                .font(.system(size: 14))
                .foregroundStyle(Tokens.Color.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Tokens.Spacing.xl)
            Button("Reintentar") {
                parseState = .idle
            }
            .foregroundStyle(Tokens.Color.accentBlue)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private var savedState: some View {
        VStack(spacing: Tokens.Spacing.md) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(Tokens.Color.accentGreen)
            Text("Guardado en el viaje")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Tokens.Color.textPrimary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { dismiss() }
        }
    }

    // MARK: - Actions

    private func runParse() async {
        guard let tripID = trip.id else { return }
        parseState = .parsing

        do {
            let response = try await AIParseClient.shared.parse(
                input: inputText,
                provider: provider,
                tripId: tripID
            )
            let editables = response.items.map { EditableParsedItem(item: $0) }
            parseState = .preview(editables)
            selectedItems = Set(editables.map(\.id))
        } catch {
            parseState = .error(error.localizedDescription)
        }
    }

    private func runParseFile() async {
        guard let tripID = trip.id,
              let fileData = selectedFileData,
              let user = Auth.auth().currentUser else { return }

        parseState = .parsing

        do {
            let storagePath = "users/\(user.uid)/parse_attachments/\(Int(Date().timeIntervalSince1970))_\(selectedFileName.isEmpty ? "attachment" : selectedFileName)"
            let storageRef = Storage.storage().reference().child(storagePath)
            let mimeType = selectedFileName.lowercased().hasSuffix(".pdf") ? "application/pdf" : "image/jpeg"
            let metadata = StorageMetadata()
            metadata.contentType = mimeType
            _ = try await storageRef.putDataAsync(fileData, metadata: metadata)

            let response = try await AIParseClient.shared.parse(
                input: "",
                inputType: "attachment",
                provider: .gemini,
                tripId: tripID,
                attachmentRef: storagePath
            )
            let editables = response.items.map { EditableParsedItem(item: $0) }
            parseState = .preview(editables)
            selectedItems = Set(editables.map(\.id))
        } catch {
            parseState = .error(error.localizedDescription)
        }
    }

    private func saveSelected(_ editables: [EditableParsedItem]) {
        guard let tripID = trip.id else { return }
        let toSave = editables
            .filter { selectedItems.contains($0.id) }
            .map(\.item)

        Task {
            do {
                try await client.saveParsedItems(toSave, tripID: tripID)
                withAnimation { parseState = .saved }
            } catch {
                parseState = .error(error.localizedDescription)
            }
        }
    }
}

// MARK: - ParsedItemCard

private struct ParsedItemCard: View {
    let item: ParsedItem
    let isSelected: Bool
    let onToggle: () -> Void
    let onEdit: () -> Void

    var body: some View {
        // The entire card taps to toggle selection; only the pencil taps to edit.
        Button(action: onToggle) {
            HStack(alignment: .top, spacing: Tokens.Spacing.md) {
                // Checkbox
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? Tokens.Color.accentBlue : Tokens.Color.textTertiary)

                // Content
                VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
                    itemTitle
                    itemSubtitle
                    if let ref = bookingRef {
                        Text("Ref: \(ref)")
                            .font(.system(size: 12))
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                }

                Spacer()

                // Confidence badge + edit button
                HStack(spacing: Tokens.Spacing.xs) {
                    ConfidenceBadge(confidence: item.confidence)

                    // Pencil — isolated tap zone, does NOT toggle selection.
                    Button {
                        onEdit()
                    } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Tokens.Color.textSecondary)
                            // Ensure ≥44×44 pt touch target.
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(Tokens.Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .stroke(isSelected ? Tokens.Color.accentBlue.opacity(0.5) : Color.clear, lineWidth: 1.5)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var itemTitle: some View {
        switch item {
        case .flight(let f):
            HStack(spacing: 4) {
                Text("✈").font(.system(size: 13))
                Text("\(f.originIATA ?? "?") → \(f.destIATA ?? "?")")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
        case .hotel(let h):
            HStack(spacing: 4) {
                Text("🏨").font(.system(size: 13))
                Text(h.name ?? "Hotel")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
        case .transport(let t):
            HStack(spacing: 4) {
                Text("🚆").font(.system(size: 13))
                Text("\(t.origin ?? "?") → \(t.destination ?? "?")")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
        }
    }

    @ViewBuilder
    private var itemSubtitle: some View {
        switch item {
        case .flight(let f):
            Group {
                if let airline = f.airline, let num = f.flightNumber {
                    Text("\(airline) \(num)")
                }
                if let dep = f.departureLocalTime?.prefix(10) {
                    Text(String(dep))
                }
            }
            .font(.system(size: 13))
            .foregroundStyle(Tokens.Color.textSecondary)
        case .hotel(let h):
            if let city = h.city {
                Text(city)
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
            if let ci = h.checkIn, let co = h.checkOut {
                Text("\(ci) → \(co)")
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
        case .transport(let t):
            if let dep = t.departureLocalTime?.prefix(16) {
                Text(String(dep).replacingOccurrences(of: "T", with: " "))
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
        }
    }

    private var bookingRef: String? {
        switch item {
        case .flight(let f): return f.bookingRef
        case .hotel(let h): return h.bookingRef
        case .transport(let t): return t.bookingRef
        }
    }
}

// MARK: - ParsedItemEditSheet

private struct ParsedItemEditSheet: View {
    // Receives a copy of the editable wrapper; mutations stay local until Aplicar.
    let editable: EditableParsedItem
    let onSave: (EditableParsedItem) -> Void

    @Environment(\.dismiss) private var dismiss

    // Flight fields
    @State private var flightOrigin: String = ""
    @State private var flightDest: String = ""
    @State private var flightAirline: String = ""
    @State private var flightNumber: String = ""
    @State private var flightDep: String = ""
    @State private var flightArr: String = ""
    @State private var flightRef: String = ""

    // Hotel fields
    @State private var hotelName: String = ""
    @State private var hotelCity: String = ""
    @State private var hotelCheckIn: String = ""
    @State private var hotelCheckOut: String = ""
    @State private var hotelRef: String = ""

    // Transport fields
    @State private var transportOrigin: String = ""
    @State private var transportDest: String = ""
    @State private var transportDep: String = ""
    @State private var transportRef: String = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: Tokens.Spacing.lg) {
                        switch editable.item {
                        case .flight:
                            flightFields
                        case .hotel:
                            hotelFields
                        case .transport:
                            transportFields
                        }
                    }
                    .padding(Tokens.Spacing.base)
                }
            }
            .navigationTitle(sheetTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Aplicar") {
                        onSave(buildUpdated())
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Tokens.Color.accentPurple)
                }
            }
            .onAppear { populateFields() }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Field groups

    private var flightFields: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
            editRow(label: "Origen IATA", placeholder: "EZE", text: $flightOrigin, transform: .uppercase)
            editRow(label: "Destino IATA", placeholder: "MAD", text: $flightDest, transform: .uppercase)
            editRow(label: "Aerolínea", placeholder: "Iberia", text: $flightAirline)
            editRow(label: "Número de vuelo", placeholder: "IB6844", text: $flightNumber)
            editRow(label: "Salida local", placeholder: "2026-06-23T21:35", text: $flightDep)
            editRow(label: "Llegada local", placeholder: "2026-06-24T13:20", text: $flightArr)
            editRow(label: "Booking ref", placeholder: "ABC123", text: $flightRef)
        }
    }

    private var hotelFields: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
            editRow(label: "Nombre del hotel", placeholder: "NH Collection Madrid", text: $hotelName)
            editRow(label: "Ciudad", placeholder: "Madrid", text: $hotelCity)
            editRow(label: "Check-in", placeholder: "2026-06-23", text: $hotelCheckIn)
            editRow(label: "Check-out", placeholder: "2026-07-08", text: $hotelCheckOut)
            editRow(label: "Booking ref", placeholder: "ABC123", text: $hotelRef)
        }
    }

    private var transportFields: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
            editRow(label: "Origen", placeholder: "Madrid Atocha", text: $transportOrigin)
            editRow(label: "Destino", placeholder: "Barcelona Sants", text: $transportDest)
            editRow(label: "Salida local", placeholder: "2026-06-23T09:00", text: $transportDep)
            editRow(label: "Booking ref", placeholder: "ABC123", text: $transportRef)
        }
    }

    // MARK: - Shared row builder

    private enum TextTransform { case none, uppercase }

    private func editRow(
        label: String,
        placeholder: String,
        text: Binding<String>,
        transform: TextTransform = .none
    ) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Tokens.Color.textSecondary)

            TextField(placeholder, text: text)
                .font(.system(size: 15))
                .foregroundStyle(Tokens.Color.textPrimary)
                .autocorrectionDisabled()
                .textInputAutocapitalization(transform == .uppercase ? .characters : .never)
                .padding(.horizontal, Tokens.Spacing.md)
                .padding(.vertical, Tokens.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                        .fill(Tokens.Color.elevated)
                )
                .onChange(of: text.wrappedValue) { _, newValue in
                    if transform == .uppercase {
                        text.wrappedValue = newValue.uppercased()
                    }
                }
        }
    }

    // MARK: - Helpers

    private var sheetTitle: String {
        switch editable.item {
        case .flight: return "Editar vuelo"
        case .hotel:  return "Editar hotel"
        case .transport: return "Editar transporte"
        }
    }

    private func populateFields() {
        switch editable.item {
        case .flight(let f):
            flightOrigin  = f.originIATA ?? ""
            flightDest    = f.destIATA ?? ""
            flightAirline = f.airline ?? ""
            flightNumber  = f.flightNumber ?? ""
            flightDep     = f.departureLocalTime ?? ""
            flightArr     = f.arrivalLocalTime ?? ""
            flightRef     = f.bookingRef ?? ""
        case .hotel(let h):
            hotelName     = h.name ?? ""
            hotelCity     = h.city ?? ""
            hotelCheckIn  = h.checkIn ?? ""
            hotelCheckOut = h.checkOut ?? ""
            hotelRef      = h.bookingRef ?? ""
        case .transport(let t):
            transportOrigin = t.origin ?? ""
            transportDest   = t.destination ?? ""
            transportDep    = t.departureLocalTime ?? ""
            transportRef    = t.bookingRef ?? ""
        }
    }

    private func buildUpdated() -> EditableParsedItem {
        var updated = editable
        switch editable.item {
        case .flight(var f):
            f.originIATA         = flightOrigin.isEmpty ? nil : flightOrigin
            f.destIATA           = flightDest.isEmpty   ? nil : flightDest
            f.airline            = flightAirline.isEmpty ? nil : flightAirline
            f.flightNumber       = flightNumber.isEmpty  ? nil : flightNumber
            f.departureLocalTime = flightDep.isEmpty     ? nil : flightDep
            f.arrivalLocalTime   = flightArr.isEmpty     ? nil : flightArr
            f.bookingRef         = flightRef.isEmpty     ? nil : flightRef
            updated.item = .flight(f)
        case .hotel(var h):
            h.name      = hotelName.isEmpty     ? nil : hotelName
            h.city      = hotelCity.isEmpty     ? nil : hotelCity
            h.checkIn   = hotelCheckIn.isEmpty  ? nil : hotelCheckIn
            h.checkOut  = hotelCheckOut.isEmpty ? nil : hotelCheckOut
            h.bookingRef = hotelRef.isEmpty     ? nil : hotelRef
            updated.item = .hotel(h)
        case .transport(var t):
            t.origin              = transportOrigin.isEmpty ? nil : transportOrigin
            t.destination         = transportDest.isEmpty   ? nil : transportDest
            t.departureLocalTime  = transportDep.isEmpty    ? nil : transportDep
            t.bookingRef          = transportRef.isEmpty    ? nil : transportRef
            updated.item = .transport(t)
        }
        return updated
    }
}

// MARK: - ConfidenceBadge

struct ConfidenceBadge: View {
    let confidence: Double

    private var color: Color {
        if confidence >= 0.90 { return Tokens.Color.accentGreen }
        if confidence >= 0.70 { return Tokens.Color.accentOrange }
        return Tokens.Color.accentRed
    }

    private var label: String {
        "\(Int(confidence * 100))%"
    }

    var body: some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(RoundedRectangle(cornerRadius: Tokens.Radius.pill).fill(color.opacity(0.15)))
    }
}

