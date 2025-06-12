import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Esta función ha sido deshabilitada para evitar errores.",
  })
}
