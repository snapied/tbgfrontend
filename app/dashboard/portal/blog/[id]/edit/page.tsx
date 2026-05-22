"use client"

import { BlogEditor } from "@/components/portal/blog-editor"
import { use } from "react"

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <BlogEditor postId={id} />
}
