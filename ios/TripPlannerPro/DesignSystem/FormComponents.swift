import SwiftUI

// MARK: - EditSheetShell
//
// Shell compartido por todos los edit sheets: título display, scroll de
// campos, footer con Cancelar / Eliminar / Guardar.
struct EditSheetShell<Content: View>: View {
    let title: String
    let isEditing: Bool
    let canSave: Bool
    let isSaving: Bool
    let error: String?
    let onCancel: () -> Void
    let onSave: () -> Void
    let onDelete: (() -> Void)?
    let content: () -> Content

    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 8) {
                            MonoLabel(
                                text: isEditing ? "Editar" : "Nuevo",
                                color: Tokens.Color.textTertiary,
                                size: .xs
                            )
                            Text(title)
                                .font(.system(size: 28, weight: .bold))
                                .tracking(Tokens.Track.displayTight)
                                .foregroundStyle(Tokens.Color.textPrimary)
                        }
                        .padding(.top, 8)

                        content()

                        if let error {
                            Text(error)
                                .font(Tokens.Typo.bodyS)
                                .foregroundStyle(Tokens.Color.accentRed)
                                .padding(.top, 4)
                        }

                        if isEditing, let onDelete {
                            Button(role: .destructive) {
                                showDeleteConfirm = true
                            } label: {
                                HStack {
                                    Image(systemName: "trash")
                                        .font(.system(size: 13))
                                    Text("Eliminar")
                                        .font(Tokens.Typo.strongS)
                                }
                                .foregroundStyle(Tokens.Color.accentRed)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                        .fill(Tokens.Color.accentRed.opacity(0.12))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                                .strokeBorder(Tokens.Color.accentRed.opacity(0.3), lineWidth: 0.5)
                                        )
                                )
                            }
                            .buttonStyle(.plain)
                            .padding(.top, 20)
                            .confirmationDialog("¿Eliminar este item?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                                Button("Eliminar", role: .destructive, action: onDelete)
                                Button("Cancelar", role: .cancel) {}
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar", action: onCancel)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Guardar", action: onSave)
                        .disabled(!canSave || isSaving)
                        .fontWeight(.semibold)
                        .foregroundStyle(canSave ? Tokens.Color.accentBlue : Tokens.Color.textTertiary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - EditField

struct EditField<Content: View>: View {
    let label: String
    var hint: String? = nil
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            MonoLabel(text: label, color: Tokens.Color.textTertiary, size: .xs)
            content()
            if let hint {
                Text(hint)
                    .font(.system(size: 11))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
        }
    }
}

// MARK: - TextFieldInput

struct TextFieldInput: View {
    @Binding var text: String
    var placeholder: String = ""
    var keyboard: UIKeyboardType = .default
    var uppercase: Bool = false
    var autocorrect: Bool = true

    var body: some View {
        TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(Tokens.Color.textTertiary))
            .font(Tokens.Typo.bodyL)
            .foregroundStyle(Tokens.Color.textPrimary)
            .keyboardType(keyboard)
            .textInputAutocapitalization(uppercase ? .characters : .sentences)
            .autocorrectionDisabled(!autocorrect)
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
    }
}

// MARK: - DoubleInput

struct DoubleInput: View {
    @Binding var value: Double?
    var placeholder: String = "0"

    @State private var text: String = ""

    var body: some View {
        TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(Tokens.Color.textTertiary))
            .font(.system(size: 16, weight: .semibold, design: .monospaced))
            .foregroundStyle(Tokens.Color.textPrimary)
            .keyboardType(.decimalPad)
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
            .onAppear {
                if let v = value {
                    text = v == v.rounded() ? "\(Int(v))" : String(v)
                }
            }
            .onChange(of: text) { _, newValue in
                let normalized = newValue.replacingOccurrences(of: ",", with: ".")
                value = Double(normalized)
            }
    }
}

// MARK: - EditDatePicker

struct EditDatePicker: View {
    let label: String
    @Binding var date: Date

    var body: some View {
        DatePicker(label, selection: $date, displayedComponents: .date)
            .tint(Tokens.Color.accentBlue)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
    }
}

// MARK: - LocalDateTimeInput
//
// Simple picker that splits an "yyyy-MM-ddTHH:mm" string into a Date picker.
struct LocalDateTimeInput: View {
    @Binding var value: String
    var placeholder: String = "yyyy-MM-ddTHH:mm"

    @State private var date: Date = Date()
    @State private var didInit = false

    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm"
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    var body: some View {
        DatePicker("", selection: $date, displayedComponents: [.date, .hourAndMinute])
            .labelsHidden()
            .datePickerStyle(.compact)
            .tint(Tokens.Color.accentBlue)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
            .onAppear {
                guard !didInit else { return }
                didInit = true
                if let d = Self.formatter.date(from: value) {
                    date = d
                }
            }
            .onChange(of: date) { _, newDate in
                value = Self.formatter.string(from: newDate)
            }
    }
}

// MARK: - PickerInput<T>

struct PickerInput<T: Hashable>: View {
    @Binding var selection: T
    let options: [(T, String)]

    var body: some View {
        Menu {
            ForEach(options, id: \.0) { opt in
                Button(opt.1) { selection = opt.0 }
            }
        } label: {
            HStack {
                Text(currentLabel)
                    .font(Tokens.Typo.bodyL)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Spacer()
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private var currentLabel: String {
        options.first(where: { $0.0 == selection })?.1 ?? String(describing: selection)
    }
}

// MARK: - Common timezones

enum CommonTimezones {
    static let options: [String] = [
        "America/Argentina/Buenos_Aires",
        "America/Sao_Paulo",
        "America/New_York",
        "America/Los_Angeles",
        "America/Mexico_City",
        "America/Santiago",
        "America/Bogota",
        "Europe/Madrid",
        "Europe/London",
        "Europe/Paris",
        "Europe/Rome",
        "Europe/Berlin",
        "Europe/Lisbon",
        "Europe/Amsterdam",
        "Europe/Zurich",
        "Europe/Athens",
        "Europe/Istanbul",
        "Africa/Cairo",
        "Asia/Tokyo",
        "Asia/Seoul",
        "Asia/Shanghai",
        "Asia/Singapore",
        "Asia/Bangkok",
        "Asia/Dubai",
        "Australia/Sydney",
        "Pacific/Auckland",
        "UTC"
    ]
}

enum CommonCurrencies {
    static let options: [String] = [
        "USD", "EUR", "ARS", "BRL", "GBP", "JPY",
        "MXN", "CLP", "COP", "PEN", "UYU",
        "CHF", "AUD", "NZD", "CAD", "SGD", "HKD",
        "TRY", "INR", "CNY", "THB"
    ]
}
