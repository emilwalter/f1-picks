"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function JoinRoomDialog() {
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const joinRoom = useMutation(api.mutations.rooms.joinRoom);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("Please enter a join code");
      return;
    }

    setIsJoining(true);
    try {
      const roomId = await joinRoom({
        joinCode: joinCode.trim().toUpperCase(),
      });
      toast.success("Successfully joined room!");
      setOpen(false);
      setJoinCode("");
      router.push(`/rooms/${roomId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join room"
      );
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-sm border border-paddock-cyan/30 bg-transparent px-4 py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-paddock-cyan-soft transition-colors hover:border-paddock-cyan/60 hover:bg-paddock-surface-high"
        >
          Join room
        </button>
      </DialogTrigger>
      <DialogContent className="bg-paddock-surface-low">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold italic uppercase tracking-tight text-paddock-on">
            Join a Room
          </DialogTitle>
          <DialogDescription className="text-paddock-on-muted">
            Enter the 6-character join code to join a prediction room.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label
              htmlFor="joinCode"
              className="mb-1.5 block font-display text-[10px] font-semibold uppercase tracking-widest text-paddock-on-muted"
            >
              Join Code
            </label>
            <input
              id="joinCode"
              type="text"
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
              className="w-full rounded-sm bg-paddock-surface px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.3em] text-paddock-on placeholder:text-paddock-on-muted focus:outline-none focus:ring-1 focus:ring-paddock-cyan/40"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-sm bg-paddock-surface-high py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-paddock-on transition-colors hover:bg-paddock-surface-highest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoining}
              className="flex-1 rounded-sm bg-paddock-accent py-2.5 font-display text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-paddock-accent/90 disabled:opacity-50"
            >
              {isJoining ? "Joining..." : "Join Room"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
