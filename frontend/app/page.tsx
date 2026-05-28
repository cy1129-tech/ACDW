export default async function Home() {
  // 1. Fetch data from your Express backend
  const res = await fetch('http://127.0.0.1:5000/', { cache: 'no-store' });
  const data = await res.json();

  // 2. Display the UI
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-24 text-black">
      <h1 className="text-4xl font-bold mb-8">ACDW AI System</h1>
      
      <div className="p-8 bg-white rounded-xl shadow-lg border border-gray-200 text-center">
        <h2 className="text-2xl font-semibold text-green-600 mb-4">
          ✅ Connection Successful
        </h2>
        <p className="text-lg text-gray-700">
          Message from Express: <br/>
          <span className="font-mono bg-gray-100 p-2 rounded mt-2 inline-block">
            "{data.message}"
          </span>
        </p>
      </div>
    </main>
  );
}