import { QueryDemo } from '@/components/query-demo';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white text-center mb-12">
          query-cache-client Demo
        </h1>
        <QueryDemo />
      </div>
    </main>
  );
}
