"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { getDriverImageUrl, getTeamLogoUrl } from "@/lib/f1-images";

export interface Driver {
  driverNumber: number;
  name: string;
  teamName: string;
  teamLogo?: string;
  countryCode: string;
}

interface DriverComboboxProps {
  drivers: Driver[];
  value: number | undefined;
  onChange: (driverNumber: number) => void;
  excludeDriverNumbers?: number[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Search string for filtering - includes name and team so users can search
 * "lewis", "hamilton", "ferrari", "mercedes", etc.
 */
function getDriverSearchValue(driver: Driver): string {
  return `${driver.name} ${driver.teamName}`.toLowerCase();
}

export function DriverCombobox({
  drivers,
  value,
  onChange,
  excludeDriverNumbers = [],
  placeholder = "Search driver (e.g. lewis, ferrari, hamilton)...",
  disabled = false,
  className,
}: DriverComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const availableDrivers = drivers.filter(
    (d) => !excludeDriverNumbers.includes(d.driverNumber)
  );

  const selectedDriver = drivers.find((d) => d.driverNumber === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "min-w-0 flex-1 justify-between font-normal",
            !selectedDriver && "text-muted-foreground",
            className
          )}
        >
          {selectedDriver ? (
            <span className="truncate">
              #{selectedDriver.driverNumber} {selectedDriver.name} -{" "}
              {selectedDriver.teamName}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, searchValue) => {
            const search = searchValue.toLowerCase();
            const item = itemValue.toLowerCase();
            return item.includes(search) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No driver found.</CommandEmpty>
            <CommandGroup>
              {availableDrivers.map((driver) => (
                <CommandItem
                  key={driver.driverNumber}
                  value={getDriverSearchValue(driver)}
                  onSelect={() => {
                    onChange(driver.driverNumber);
                    setOpen(false);
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={getDriverImageUrl(
                          driver.driverNumber,
                          driver.name,
                          driver.teamName
                        )}
                        alt={driver.name}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{driver.name}</div>
                      <div className="flex items-center gap-2">
                        <div className="relative h-3 w-3 shrink-0 overflow-hidden rounded">
                          <Image
                            src={getTeamLogoUrl(
                              driver.teamName,
                              driver.teamLogo
                            )}
                            alt={driver.teamName}
                            fill
                            className="object-cover"
                            sizes="12px"
                          />
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {driver.teamName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 size-4 shrink-0",
                      value === driver.driverNumber
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
