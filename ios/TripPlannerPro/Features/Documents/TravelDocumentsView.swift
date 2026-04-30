import FirebaseStorage
import QuickLook
import SwiftUI
import UniformTypeIdentifiers

// MARK: - TravelDocumentsView

struct TravelDocumentsView: View {
    @Environment(FirestoreClient.self) private var client
    @State private var documents: [TravelDocument] = []
    @State private var isLoading = true
    @State private var showAddSheet = false
    @State private var deleteTarget: TravelDocument? = nil
    @State private var previewDoc: TravelDocument? = nil
    @State private var previewURL: URL? = nil
    @State private var isLoadingPreview = false
    @State private var previewError: String? = nil
    @State private var shareItem: ShareItem? = nil

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                if isLoading {
                    ProgressView()
                        .tint(Tokens.Color.textSecondary)
                } else if documents.isEmpty {
                    emptyState
                } else {
                    list
                }
            }
            .navigationTitle("Documentos")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.semibold)
                    }
                    .tint(Tokens.Color.accentBlue)
                }
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showAddSheet) {
            AddTravelDocumentSheet { newDoc in
                Task { try? await client.createTravelDocument(newDoc) }
            }
        }
        .sheet(item: $previewDoc) { doc in
            if let url = previewURL {
                ShareableQLPreview(url: url, onShare: { shareItem = ShareItem(url: url) })
                    .ignoresSafeArea()
            } else if isLoadingPreview {
                ZStack {
                    Tokens.Color.bgPrimary.ignoresSafeArea()
                    ProgressView()
                        .tint(Tokens.Color.textSecondary)
                }
            } else if let err = previewError {
                ZStack {
                    Tokens.Color.bgPrimary.ignoresSafeArea()
                    VStack(spacing: Tokens.Spacing.md) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundStyle(Tokens.Color.accentRed)
                        Text(err)
                            .font(Tokens.Typo.bodyS)
                            .foregroundStyle(Tokens.Color.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                }
            }
        }
        .sheet(item: $shareItem) { item in
            ShareSheet(items: [item.url])
        }
        .alert("Eliminar documento", isPresented: Binding(
            get: { deleteTarget != nil },
            set: { if !$0 { deleteTarget = nil } }
        )) {
            Button("Eliminar", role: .destructive) {
                if let doc = deleteTarget, let id = doc.id {
                    deleteTarget = nil
                    Task { try? await client.deleteTravelDocument(id: id, storagePath: doc.storageRef) }
                }
            }
            Button("Cancelar", role: .cancel) { deleteTarget = nil }
        } message: {
            Text("Esta accion no se puede deshacer.")
        }
        .task {
            await streamDocuments()
        }
    }

    // MARK: - Subviews

    private var emptyState: some View {
        VStack(spacing: Tokens.Spacing.lg) {
            Image(systemName: "doc.fill.badge.plus")
                .font(.system(size: 48))
                .foregroundStyle(Tokens.Color.textTertiary)
            VStack(spacing: Tokens.Spacing.xs) {
                Text("Sin documentos")
                    .font(Tokens.Typo.strongM)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text("Guardá pasaportes, visas y seguros\npara tenerlos a mano cuando viajás.")
                    .font(Tokens.Typo.bodyS)
                    .foregroundStyle(Tokens.Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
            Button {
                showAddSheet = true
            } label: {
                Label("Agregar documento", systemImage: "plus")
                    .font(Tokens.Typo.strongS)
                    .foregroundStyle(Tokens.Color.accentBlue)
                    .padding(.horizontal, Tokens.Spacing.lg)
                    .padding(.vertical, Tokens.Spacing.sm)
                    .background(Tokens.Color.accentBlue.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
            }
            .buttonStyle(.plain)
        }
        .padding()
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: Tokens.Spacing.sm) {
                ForEach(documents) { doc in
                    DocumentRow(doc: doc) {
                        openPreview(doc)
                    } onDelete: {
                        deleteTarget = doc
                    }
                }
            }
            .padding(.horizontal, Tokens.Spacing.base)
            .padding(.vertical, Tokens.Spacing.md)
        }
    }

    // MARK: - Helpers

    private func streamDocuments() async {
        do {
            for try await docs in try client.travelDocumentsStream() {
                documents = docs
                isLoading = false
            }
        } catch {
            isLoading = false
        }
    }

    private func openPreview(_ doc: TravelDocument) {
        previewURL = nil
        previewError = nil
        isLoadingPreview = true
        previewDoc = doc
        Task {
            do {
                let url = try await StorageClient.shared.downloadTravelDocument(storagePath: doc.storageRef)
                previewURL = url
            } catch {
                previewError = "No se pudo cargar el documento."
            }
            isLoadingPreview = false
        }
    }
}

// MARK: - DocumentRow

private struct DocumentRow: View {
    let doc: TravelDocument
    let onPreview: () -> Void
    let onDelete: () -> Void

    var body: some View {
        Button(action: onPreview) {
            HStack(spacing: Tokens.Spacing.md) {
                ZStack {
                    RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                        .fill(doc.type.tint.opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: doc.type.systemImage)
                        .font(.system(size: 20))
                        .foregroundStyle(doc.type.tint)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(doc.title)
                        .font(Tokens.Typo.strongM)
                        .foregroundStyle(Tokens.Color.textPrimary)
                        .lineLimit(1)
                    HStack(spacing: Tokens.Spacing.xs) {
                        Text(doc.type.label.uppercased())
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(doc.type.tint)
                        if let days = doc.expiresInDays {
                            Text("·")
                                .foregroundStyle(Tokens.Color.textTertiary)
                            Text(expiryLabel(days: days))
                                .font(.system(size: 11))
                                .foregroundStyle(days < 0 ? Tokens.Color.accentRed : days < 90 ? Tokens.Color.accentOrange : Tokens.Color.textTertiary)
                        }
                    }
                }

                Spacer()

                Image(systemName: doc.isPDF ? "doc.fill" : "photo.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            .padding(Tokens.Spacing.md)
            .background(Tokens.Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .stroke(Tokens.Color.borderSoft, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive, action: onDelete) {
                Label("Eliminar", systemImage: "trash")
            }
        }
    }

    private func expiryLabel(days: Int) -> String {
        if days < 0 { return "Vencido" }
        if days == 0 { return "Vence hoy" }
        if days == 1 { return "Vence mañana" }
        if days < 30 { return "Vence en \(days) días" }
        let months = days / 30
        if months < 12 { return "Vence en \(months) mes\(months == 1 ? "" : "es")" }
        let years = days / 365
        return "Vence en \(years) año\(years == 1 ? "" : "s")"
    }
}

// MARK: - AddTravelDocumentSheet

struct AddTravelDocumentSheet: View {
    let onSave: (TravelDocument) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var docType: TravelDocumentType = .passport
    @State private var title = ""
    @State private var expiresAt = ""
    @State private var notes = ""
    @State private var showFilePicker = false
    @State private var fileData: Data? = nil
    @State private var fileName = ""
    @State private var mimeType = ""
    @State private var isSaving = false
    @State private var saveError: String? = nil

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty && fileData != nil && !isSaving
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: Tokens.Spacing.lg) {
                        typeSection
                        titleSection
                        fileSection
                        expirySection
                        notesSection

                        if let err = saveError {
                            Text(err)
                                .font(Tokens.Typo.bodyS)
                                .foregroundStyle(Tokens.Color.accentRed)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.horizontal, Tokens.Spacing.base)
                    .padding(.top, Tokens.Spacing.md)
                    .padding(.bottom, Tokens.Spacing.xxl)
                }
            }
            .navigationTitle("Nuevo documento")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView().tint(Tokens.Color.accentBlue)
                    } else {
                        Button("Guardar") { save() }
                            .font(Tokens.Typo.strongS)
                            .foregroundStyle(canSave ? Tokens.Color.accentBlue : Tokens.Color.textTertiary)
                            .disabled(!canSave)
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
        .fileImporter(
            isPresented: $showFilePicker,
            allowedContentTypes: [.pdf, .image],
            allowsMultipleSelection: false
        ) { result in
            if case .success(let urls) = result, let url = urls.first {
                guard url.startAccessingSecurityScopedResource() else { return }
                defer { url.stopAccessingSecurityScopedResource() }
                fileData = try? Data(contentsOf: url)
                fileName = url.lastPathComponent
                mimeType = url.pathExtension.lowercased() == "pdf" ? "application/pdf" : "image/jpeg"
                if title.isEmpty { title = url.deletingPathExtension().lastPathComponent }
            }
        }
    }

    private var typeSection: some View {
        FormSection(header: "Tipo") {
            HStack(spacing: Tokens.Spacing.sm) {
                ForEach(TravelDocumentType.allCases, id: \.self) { t in
                    let isActive = docType == t
                    Button { docType = t } label: {
                        VStack(spacing: 4) {
                            Image(systemName: t.systemImage)
                                .font(.system(size: 16))
                            Text(t.label)
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundStyle(isActive ? t.tint : Tokens.Color.textTertiary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Tokens.Spacing.sm)
                        .background(isActive ? t.tint.opacity(0.13) : Tokens.Color.elevated)
                        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.sm))
                        .overlay(
                            RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                                .stroke(isActive ? t.tint.opacity(0.4) : Tokens.Color.border, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var titleSection: some View {
        FormSection(header: "Nombre") {
            TextField("Ej. Pasaporte vence 2031", text: $title)
                .font(Tokens.Typo.bodyM)
                .foregroundStyle(Tokens.Color.textPrimary)
                .tint(Tokens.Color.accentBlue)
        }
    }

    private var fileSection: some View {
        FormSection(header: "Archivo") {
            Button {
                showFilePicker = true
            } label: {
                HStack {
                    Image(systemName: fileData == nil ? "arrow.up.doc" : "doc.fill.badge.checkmark")
                        .font(.system(size: 15))
                        .foregroundStyle(fileData == nil ? Tokens.Color.accentBlue : Tokens.Color.accentGreen)
                    Text(fileData == nil ? "Seleccionar PDF o imagen" : fileName)
                        .font(Tokens.Typo.bodyM)
                        .foregroundStyle(fileData == nil ? Tokens.Color.accentBlue : Tokens.Color.textPrimary)
                        .lineLimit(1)
                    Spacer()
                    if fileData != nil {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }

    private var expirySection: some View {
        FormSection(header: "Vencimiento (opcional)") {
            TextField("AAAA-MM-DD", text: $expiresAt)
                .font(Tokens.Typo.monoS)
                .foregroundStyle(Tokens.Color.textPrimary)
                .tint(Tokens.Color.accentBlue)
                .keyboardType(.numbersAndPunctuation)
        }
    }

    private var notesSection: some View {
        FormSection(header: "Notas (opcional)") {
            TextField("Notas adicionales", text: $notes, axis: .vertical)
                .font(Tokens.Typo.bodyM)
                .foregroundStyle(Tokens.Color.textPrimary)
                .tint(Tokens.Color.accentBlue)
                .lineLimit(3...6)
        }
    }

    private func save() {
        guard let data = fileData else { return }
        isSaving = true
        saveError = nil
        Task {
            do {
                let uniqueName = "\(UUID().uuidString)_\(fileName)"
                let storagePath = try await StorageClient.shared.uploadTravelDocument(
                    data: data, fileName: uniqueName, mimeType: mimeType
                )
                let doc = TravelDocument(
                    type: docType,
                    title: title.trimmingCharacters(in: .whitespaces),
                    storageRef: storagePath,
                    fileName: fileName,
                    mimeType: mimeType,
                    expiresAt: expiresAt.isEmpty ? nil : expiresAt,
                    notes: notes.isEmpty ? nil : notes,
                    createdAt: .now
                )
                onSave(doc)
                dismiss()
            } catch {
                saveError = "No se pudo guardar el documento. Intentá de nuevo."
                isSaving = false
            }
        }
    }
}

// MARK: - FormSection

private struct FormSection<Content: View>: View {
    let header: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
            Text(header.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.5)
                .foregroundStyle(Tokens.Color.textTertiary)
                .padding(.leading, Tokens.Spacing.xs)

            VStack(alignment: .leading, spacing: 0) {
                content()
            }
            .padding(.horizontal, Tokens.Spacing.base)
            .padding(.vertical, Tokens.Spacing.md)
            .background(Tokens.Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .stroke(Tokens.Color.borderSoft, lineWidth: 1)
            )
        }
    }
}

// MARK: - ShareableQLPreview

private struct ShareableQLPreview: UIViewControllerRepresentable {
    let url: URL
    let onShare: () -> Void

    func makeUIViewController(context: Context) -> QLPreviewController {
        let vc = QLPreviewController()
        vc.dataSource = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: QLPreviewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(url: url) }

    class Coordinator: NSObject, QLPreviewControllerDataSource {
        let url: URL
        init(url: URL) { self.url = url }
        func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> any QLPreviewItem {
            url as NSURL
        }
    }
}

// MARK: - Helpers

private struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}
