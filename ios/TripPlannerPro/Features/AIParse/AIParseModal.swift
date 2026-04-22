import SwiftUI

enum ParseMode: String, CaseIterable {
    case chat = "Chat"
    case manual = "Manual"

    var icon: String {
        switch self {
        case .chat: return "sparkles"
        case .manual: return "pencil"
        }
    }
}

struct AIParseModal: View {
    let trip: Trip
    var prefillText: String = ""

    @Environment(FirestoreClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @State private var mode: ParseMode = .chat
    @State private var inputText = ""
    @State private var provider: AIProvider = .claude
    @State private var parseState: ParseState = .idle
    @State private var selectedItems: Set<String> = []

    enum ParseState {
        case idle
        case parsing
        case preview([ParsedItem])
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
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") { dismiss() }
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
                if case .preview(let items) = parseState {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Guardar \(selectedItems.count)") {
                            saveSelected(items)
                        }
                        .disabled(selectedItems.isEmpty)
                        .foregroundStyle(selectedItems.isEmpty ? Tokens.Color.textTertiary : Tokens.Color.accentBlue)
                    }
                }
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
                } else {
                    ManualItemsPlaceholder(trip: trip)
                }
            }
            .padding(Tokens.Spacing.base)
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

    private func previewArea(_ items: [ParsedItem]) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
                HStack {
                    Text("Se encontraron \(items.count) items")
                        .font(.system(size: 13))
                        .foregroundStyle(Tokens.Color.textSecondary)
                    Spacer()
                    Button {
                        if selectedItems.count == items.count {
                            selectedItems.removeAll()
                        } else {
                            selectedItems = Set(items.map(\.id))
                        }
                    } label: {
                        Text(selectedItems.count == items.count ? "Deseleccionar todo" : "Seleccionar todo")
                            .font(.system(size: 13))
                            .foregroundStyle(Tokens.Color.accentBlue)
                    }
                }

                ForEach(items) { item in
                    ParsedItemCard(
                        item: item,
                        isSelected: selectedItems.contains(item.id),
                        onToggle: {
                            if selectedItems.contains(item.id) {
                                selectedItems.remove(item.id)
                            } else {
                                selectedItems.insert(item.id)
                            }
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
            parseState = .preview(response.items)
            selectedItems = Set(response.items.map(\.id))
        } catch {
            parseState = .error(error.localizedDescription)
        }
    }

    private func saveSelected(_ items: [ParsedItem]) {
        guard let tripID = trip.id else { return }
        let toSave = items.filter { selectedItems.contains($0.id) }

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

    var body: some View {
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

                // Confidence badge
                ConfidenceBadge(confidence: item.confidence)
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

// MARK: - ConfidenceBadge

struct ConfidenceBadge: View {
    let confidence: Double

    private var color: Color {
        if confidence >= 0.85 { return Tokens.Color.accentGreen }
        if confidence >= 0.60 { return Tokens.Color.accentOrange }
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

// MARK: - Manual Placeholder

private struct ManualItemsPlaceholder: View {
    let trip: Trip

    var body: some View {
        Text("Formulario manual — próximamente")
            .font(.system(size: 14))
            .foregroundStyle(Tokens.Color.textTertiary)
            .frame(maxWidth: .infinity, minHeight: 200, alignment: .center)
    }
}
