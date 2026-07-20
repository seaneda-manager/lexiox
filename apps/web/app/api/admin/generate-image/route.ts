import { NextResponse } from "next/server";

export const runtime = "nodejs";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ ok: false, error: "prompt required" }, { status: 400 });
    if (!HF_API_KEY) return NextResponse.json({ ok: false, error: "HF API key not configured" }, { status: 500 });

    const res = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: text }, { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ ok: true, imageUrl: dataUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
