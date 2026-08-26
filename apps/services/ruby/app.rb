require "json"
require "webrick"

server = WEBrick::HTTPServer.new(
  Port: 4103,
  BindAddress: "127.0.0.1",
  AccessLog: [],
  Logger: WEBrick::Log.new($stderr, WEBrick::Log::WARN)
)

server.mount_proc "/health" do |_request, response|
  response["Content-Type"] = "application/json"
  response.body = JSON.generate(service: "ruby", status: "ok", runtime: "ruby")
end

trap("INT") { server.shutdown }
warn "Ruby service listening on http://127.0.0.1:4103"
server.start

