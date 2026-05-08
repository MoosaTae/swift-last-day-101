import XCTest
@testable import PracticeKit

private struct StubLoader: DataLoading {
    let result: Result<Data, Error>
    func load(from url: URL) async throws -> Data {
        switch result {
        case .success(let data): return data
        case .failure(let err): throw err
        }
    }
}

private struct User: Decodable, Equatable, Sendable {
    let id: Int
    let name: String
}

final class RemoteFetcherTests: XCTestCase {
    func test_fetch_loaded_onValidJSON() async {
        let json = #"[{"id":1,"name":"Ada"},{"id":2,"name":"Lin"}]"#.data(using: .utf8)!
        let fetcher = RemoteFetcher<[User]>(loader: StubLoader(result: .success(json)))
        let phase = await fetcher.fetch(URL(string: "https://example.com")!)
        XCTAssertEqual(phase.value, [User(id: 1, name: "Ada"), User(id: 2, name: "Lin")])
        XCTAssertNil(phase.errorMessage)
    }

    func test_fetch_failed_onMalformedJSON() async {
        let bad = Data("not json".utf8)
        let fetcher = RemoteFetcher<[User]>(loader: StubLoader(result: .success(bad)))
        let phase = await fetcher.fetch(URL(string: "https://example.com")!)
        XCTAssertNil(phase.value)
        XCTAssertNotNil(phase.errorMessage)
    }

    func test_fetch_failed_onNetworkError() async {
        struct Boom: Error {}
        let fetcher = RemoteFetcher<[User]>(loader: StubLoader(result: .failure(Boom())))
        let phase = await fetcher.fetch(URL(string: "https://example.com")!)
        XCTAssertNil(phase.value)
    }

    func test_phase_helpers() {
        XCTAssertTrue(Phase<Int>.loading.isLoading)
        XCTAssertEqual(Phase<Int>.loaded(42).value, 42)
        XCTAssertEqual(Phase<Int>.failed("oops").errorMessage, "oops")
    }
}
