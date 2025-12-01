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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
        <Button variant="outline">Join Room</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Room</DialogTitle>
          <DialogDescription>
            Enter the 6-character join code to join a prediction room.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="joinCode">Join Code</FieldLabel>
              <Input
                id="joinCode"
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-center text-lg tracking-wider"
                autoFocus
              />
              <FieldDescription>
                Enter the 6-character join code provided by the room host.
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isJoining}>
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
