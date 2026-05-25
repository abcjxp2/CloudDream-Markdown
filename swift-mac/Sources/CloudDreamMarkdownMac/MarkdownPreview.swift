import SwiftUI
import WebKit

struct MarkdownPreview: NSViewRepresentable {
    let markdown: String
    let searchText: String

    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.setValue(false, forKey: "drawsBackground")
        webView.loadHTMLString(Self.html(markdown: markdown), baseURL: nil)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        let html = Self.html(markdown: markdown)
        webView.loadHTMLString(html, baseURL: nil)

        if !searchText.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                webView.find(searchText, configuration: WKFindConfiguration()) { _ in }
            }
        }
    }

    private static var markedScript: String {
        guard let url = markedScriptURL,
              let script = try? String(contentsOf: url, encoding: .utf8) else {
            return "window.__cloudDreamMarkedLoadError = true;"
        }

        return script
    }

    private static var markedScriptURL: URL? {
        if let bundledResourceURL = Bundle.main.url(
            forResource: "CloudDreamMarkdownMac_CloudDreamMarkdownMac",
            withExtension: "bundle"
        ),
           let bundledBundle = Bundle(url: bundledResourceURL),
           let scriptURL = bundledBundle.url(forResource: "marked.min", withExtension: "js") {
            return scriptURL
        }

        return Bundle.module.url(forResource: "marked.min", withExtension: "js")
    }

    private static func html(markdown: String) -> String {
        let markdownJSON: String
        if let data = try? JSONEncoder().encode(markdown),
           let encoded = String(data: data, encoding: .utf8) {
            markdownJSON = encoded
        } else {
            markdownJSON = "\"\""
        }

        return """
        <!doctype html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            :root { color-scheme: light dark; }
            body {
              margin: 0;
              padding: 42px 72px 72px;
              font: 15px/1.62 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: CanvasText;
              background: Canvas;
            }
            main { max-width: 820px; margin: 0 auto; overflow-wrap: break-word; }
            h1, h2, h3, h4, h5, h6 { line-height: 1.25; font-weight: 600; margin: 24px 0 16px; }
            h1 { font-size: 2em; border-bottom: 1px solid color-mix(in srgb, CanvasText 18%, transparent); padding-bottom: .3em; }
            h2 { font-size: 1.5em; border-bottom: 1px solid color-mix(in srgb, CanvasText 18%, transparent); padding-bottom: .3em; }
            h3 { font-size: 1.25em; }
            p, ul, ol, blockquote, table, pre { margin: 0 0 16px; }
            a { color: LinkText; text-decoration: none; }
            a:hover { text-decoration: underline; }
            blockquote { color: color-mix(in srgb, CanvasText 62%, transparent); border-left: .25em solid color-mix(in srgb, CanvasText 22%, transparent); padding: 0 1em; }
            code { background: color-mix(in srgb, CanvasText 7%, Canvas); border-radius: 6px; padding: .2em .4em; font: 85% ui-monospace, SFMono-Regular, Menlo, monospace; }
            pre { background: color-mix(in srgb, CanvasText 7%, Canvas); border-radius: 6px; padding: 16px; overflow: auto; }
            pre code { background: transparent; padding: 0; font-size: 100%; }
            table { border-collapse: collapse; display: block; overflow: auto; width: max-content; max-width: 100%; }
            th, td { border: 1px solid color-mix(in srgb, CanvasText 22%, transparent); padding: 6px 13px; }
            th { font-weight: 600; background: color-mix(in srgb, CanvasText 7%, Canvas); }
          </style>
          <script>
          \(markedScript)
          </script>
        </head>
        <body>
          <main id="content"></main>
          <script>
            const source = \(markdownJSON);
            const renderer = window.marked;
            const parseMarkdown =
              renderer && typeof renderer.parse === 'function' ? renderer.parse.bind(renderer) :
              renderer && typeof renderer.marked === 'function' ? renderer.marked.bind(renderer) :
              typeof renderer === 'function' ? renderer :
              null;

            if (parseMarkdown) {
              document.getElementById('content').innerHTML = parseMarkdown(source, { gfm: true });
            } else {
              document.getElementById('content').textContent = source;
            }
          </script>
        </body>
        </html>
        """
    }
}
