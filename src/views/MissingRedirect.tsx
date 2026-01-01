export function MissingRedirect({ message }: { message: string }) {
  return (
    <html lang="en">
      <head>
        <title>Shorty</title>
      </head>
      <body>
        <h1>Missing Redirect</h1>
        <div class="error message">{message}</div>
      </body>
    </html>
  );
}
