"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel";

interface RaceDetailsProps {
  race: Doc<"races">;
}

export function RaceDetails({ race }: RaceDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{race.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                Circuit:
              </span>{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                {race.circuit}
              </span>
            </div>
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                Location:
              </span>{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                {race.location}
              </span>
            </div>
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                Country:
              </span>{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                {race.country}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                Date:
              </span>{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                {format(race.date, "PPP 'at' p")}
              </span>
            </div>
            {race.weatherForecast && (
              <div>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  Weather:
                </span>{" "}
                <Badge variant="outline">
                  {race.weatherForecast.condition}
                </Badge>
                <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                  {race.weatherForecast.temperature}°C
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
