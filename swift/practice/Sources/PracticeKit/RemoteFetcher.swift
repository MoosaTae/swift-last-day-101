import Foundation

public protocol DataLoading: Sendable {
    func load(from url: URL) async throws -> Data
}

public struct URLSessionLoader: DataLoading {
    public init() {}
    public func load(from url: URL) async throws -> Data {
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }
}

public struct RemoteFetcher<Value: Decodable & Sendable>: Sendable {
    private let loader: DataLoading
    private let decoder: @Sendable () -> JSONDecoder

    public init(
        loader: DataLoading = URLSessionLoader(),
        decoder: @escaping @Sendable () -> JSONDecoder = { JSONDecoder() }
    ) {
        self.loader = loader
        self.decoder = decoder
    }

    public func fetch(_ url: URL) async -> Phase<Value> {
        do {
            let data = try await loader.load(from: url)
            let value = try decoder().decode(Value.self, from: data)
            return .loaded(value)
        } catch {
            return .failed(String(describing: error))
        }
    }
}
