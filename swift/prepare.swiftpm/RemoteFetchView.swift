import SwiftUI

/// Generic four-state phase (idle / loading / loaded / failed).
/// Mirrors the pattern from learn/05-api-storage.md section 5.2.
enum Phase<T> {
    case idle
    case loading
    case loaded(T)
    case failed(String)
}

struct Post: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let body: String
}

struct RemoteFetchView: View {
    @State private var phase: Phase<[Post]> = .idle

    private let urlString = "https://jsonplaceholder.typicode.com/posts"

    var body: some View {
        Group {
            switch phase {
            case .idle:
                Text("Tap to load.").foregroundStyle(.secondary)
            case .loading:
                ProgressView("Loading posts…")
            case .loaded(let posts):
                List(posts) { post in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(post.title).font(.headline)
                        Text(post.body).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
            case .failed(let message):
                VStack(spacing: 8) {
                    Text("Failed").font(.headline)
                    Text(message).font(.footnote).foregroundStyle(.red)
                    Button("Retry") { Task { await load() } }
                }
                .padding()
            }
        }
        .navigationTitle("Posts")
        .task { await load() }
    }

    private func load() async {
        phase = .loading
        guard let url = URL(string: urlString) else {
            phase = .failed("Invalid URL"); return
        }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let http = response as? HTTPURLResponse,
               !(200..<300).contains(http.statusCode) {
                phase = .failed("HTTP \(http.statusCode)"); return
            }
            let posts = try JSONDecoder().decode([Post].self, from: data)
            phase = .loaded(posts)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }
}

#Preview {
    NavigationStack { RemoteFetchView() }
}
