import { ReactNode } from 'react'
import { TeacherSideNav } from '@/components/teacher/TeacherSideNav'


export default function AdminLayout({ children }: { children: ReactNode }) {
return (
<div className="flex gap-6">
<TeacherSideNav section="admin" />
<main className="flex-1 space-y-4">{children}</main>
</div>
)
}




