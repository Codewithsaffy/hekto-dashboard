"use server";

import { client } from "@/sanity/lib/client";

export async function getAllOrder() {
  const res = await client.fetch("*[_type == 'order']");
  return res;
}

export async function getOrder(id: string) {
  const res = await client.fetch(`*[_type == 'order' && _id == '${id}']`);
  return res;
}


