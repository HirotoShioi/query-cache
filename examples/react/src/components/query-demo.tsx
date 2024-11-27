'use client';

import { useState, useEffect } from 'react';
import { cache } from '@hirotoshioi/query-cache-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

// Simulating an API call with variable delay
const fetchData = async (key: string, delay: number) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return `Data for ${key}: ${Math.random().toString(36).substring(7)}`;
};

export function QueryDemo() {
  const [queryKey, setQueryKey] = useState('default');
  const [staleTime, setStaleTime] = useState(5000);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lastFetchTime) {
      interval = setInterval(() => {
        const elapsed = Date.now() - lastFetchTime;
        setElapsedTime(Math.min(elapsed, staleTime));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [lastFetchTime, staleTime]);

  const handleQuery = async () => {
    setLoading(true);
    const startTime = Date.now();
    const data = await cache.query<string>({
      queryKey: [queryKey],
      queryFn: () => fetchData(queryKey, 1000),
      staleTime,
    });
    const endTime = Date.now();
    setResult(`${data}\nFetch time: ${endTime - startTime}ms`);
    setLoading(false);
    setLastFetchTime(Date.now());
  };

  const handleInvalidate = async () => {
    await cache.invalidate({ queryKey: [queryKey] });
    setResult('Cache invalidated');
    setLastFetchTime(null);
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-700/90 backdrop-blur-sm text-white">
      <CardHeader>
        <CardTitle>Query Demo</CardTitle>
        <CardDescription>Test the query-cache-client library</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="queryKey">Query Key</Label>
          <Input
            id="queryKey"
            value={queryKey}
            onChange={(e) => setQueryKey(e.target.value)}
            placeholder="Enter query key"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staleTime">Stale Time (ms)</Label>
          <Input
            id="staleTime"
            type="number"
            value={staleTime}
            onChange={(e) => setStaleTime(Number(e.target.value))}
            placeholder="Enter stale time in milliseconds"
          />
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleQuery} disabled={loading}>
            {loading ? 'Loading...' : 'Fetch Data'}
          </Button>
          <Button onClick={handleInvalidate} variant="secondary">
            Invalidate Cache
          </Button>
        </div>
        {lastFetchTime && (
          <div className="space-y-2">
            <Label>Time since last fetch</Label>
            <Progress value={(elapsedTime / staleTime) * 100} />
            <p className="text-sm text-gray-300">
              {elapsedTime.toFixed(0)}ms / {staleTime}ms
            </p>
          </div>
        )}
        {result && (
          <div className="mt-4 p-4 bg-gray-600 rounded-md">
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
