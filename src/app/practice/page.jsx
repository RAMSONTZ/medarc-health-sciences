import {getBank,getQuestions,getStats} from '@/lib/bank';
import {PracticeView} from '@/components/PracticeView';
export const metadata={title:'Question practice'};
export default async function Page({searchParams}){const params=await searchParams;const b=getBank();return <PracticeView data={getQuestions(params)} stats={getStats()} subjects={b.subjects} types={b.types}/>}
