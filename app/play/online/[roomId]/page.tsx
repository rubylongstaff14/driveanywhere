import type { Metadata } from "next";
import { RoomLobby } from "@/components/multiplayer/room-lobby";

export const metadata: Metadata = {
  title: "Online — Room",
};

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { roomId } = await params;
  return <RoomLobby roomId={roomId} />;
}
