import './globals.css';
import {Shell} from '@/components/Shell';
export const metadata={
 title:{default:'MedArc — Health Sciences Learning',template:'%s | MedArc'},
 description:'MedArc medical question practice, original exam collections, and explanations in a refined learning experience.',
 robots:{index:false,follow:false},
};
export default function RootLayout({children}){
 return <html lang="en"><body><Shell>{children}</Shell></body></html>;
}
