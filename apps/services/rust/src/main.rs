use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

fn response(body: &str, status: &str) -> String {
    format!(
        "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}

fn handle(mut stream: TcpStream) {
    let mut buffer = [0; 1024];
    let _ = stream.read(&mut buffer);
    let request = String::from_utf8_lossy(&buffer);
    let path = request.split_whitespace().nth(1).unwrap_or("/");
    let (status, body) = if path == "/health" {
        ("200 OK", r#"{"service":"rust","status":"ok","runtime":"rust"}"#)
    } else {
        ("200 OK", r#"{"service":"rust","status":"ready","runtime":"rust"}"#)
    };
    let _ = stream.write_all(response(body, status).as_bytes());
}

fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind(("127.0.0.1", 4101))?;
    println!("Rust service listening on http://127.0.0.1:4101");
    for stream in listener.incoming() {
        handle(stream?);
    }
    Ok(())
}

