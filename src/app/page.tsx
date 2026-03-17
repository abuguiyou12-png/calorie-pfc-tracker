import Header from '@/components/Header';
import DailySummary from '@/components/DailySummary';
import MealSection from '@/components/MealSection';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const dateStr = typeof params.date === 'string'
    ? params.date
    : new Date().toISOString().split('T')[0];

  return (
    <>
      <Header />
      <main className="flex-1 w-full max-w-2xl mx-auto px-3 py-4 sm:p-6 space-y-6 sm:space-y-8 pb-24">
        <DailySummary selectedDate={dateStr} />

        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">食事の記録</h2>
          <MealSection mealType="breakfast" title="朝食" selectedDate={dateStr} />
          <MealSection mealType="lunch" title="昼食" selectedDate={dateStr} />
          <MealSection mealType="dinner" title="夕食" selectedDate={dateStr} />
          <MealSection mealType="snack" title="間食" selectedDate={dateStr} />
        </div>
      </main>
    </>
  );
}
