import {getBank,getQuestions,getStats} from '@/lib/bank';
import {PracticeView} from '@/components/PracticeView';
export const metadata={title:'Answers and explanations'};
export default async function Page({searchParams}){const params=await searchParams;const b=getBank();return <PracticeView data={getQuestions(params,true)} stats={getStats()} subjects={b.subjects} types={b.types} basePath="/answers" answeredOnly/>}
