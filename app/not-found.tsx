export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app text-text-primary">
      <div className="space-y-4 text-center">
        <h1 className="text-6xl font-bold font-number text-yearn-blue">404</h1>
        <h2 className="text-2xl font-bold">Page not found</h2>
        <p className="text-text-secondary max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
    </div>
  );
}
