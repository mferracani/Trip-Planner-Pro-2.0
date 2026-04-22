import Foundation

/// The UID whose Firestore subtree (`users/{ownerUID}/...`) is the shared household.
/// Set this to Mati's Firebase UID once you've done the first sign-in.
/// Wife's UID gets added to Security Rules allowlist separately — she reads from this same path.
/// Replace the placeholder before first TestFlight build.
enum HouseholdConfig {
    static var ownerUID: String? = nil  // Set at runtime after first auth
}
