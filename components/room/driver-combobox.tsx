"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
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

function getDriverSearchValue(driver: Driver): string {
  return `${driver.name} ${driver.teamName}`.toLowerCase();
}

export function DriverCombobox({
  drivers,
  value,
  onChange,
  excludeDriverNumbers = [],
  placeholder = "Select driver...",
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
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-sm bg-paddock-surface-lowest px-4 py-3 text-left transition-colors",
            "hover:bg-paddock-surface focus:outline-none focus:ring-1 focus:ring-paddock-cyan/30",
            "disabled:cursor-not-allowed disabled:opacity-40",
            className
          )}
        >
          {selectedDriver ? (
            <span className="truncate font-display text-sm font-bold uppercase tracking-wide text-paddock-on">
              #{selectedDriver.driverNumber} {selectedDriver.name}
            </span>
          ) : (
            <span className="font-display text-xs uppercase tracking-widest text-paddock-on-muted/50">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-paddock-on-muted/40" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[min(22rem,calc(100vw-2rem))] w-[var(--radix-popover-trigger-width)] max-w-[26rem] overflow-hidden rounded-sm border-0 bg-paddock-surface-high p-0 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        align="start"
        sideOffset={6}
        collisionPadding={12}
      >
        <Command
          className="bg-transparent"
          filter={(itemValue, searchValue) => {
            const search = searchValue.toLowerCase();
            const item = itemValue.toLowerCase();
            return item.includes(search) ? 1 : 0;
          }}
        >
          <div className="bg-paddock-surface-highest [&_[data-slot=command-input-wrapper]]:h-auto [&_[data-slot=command-input-wrapper]]:border-0 [&_[data-slot=command-input-wrapper]]:px-4 [&_[data-slot=command-input-wrapper]]:py-3 [&_[data-slot=command-input-wrapper]_svg]:text-paddock-on-muted/40">
            <CommandInput
              placeholder="Search by name or team..."
              className="h-auto bg-transparent p-0 font-display text-xs text-paddock-on placeholder:text-paddock-on-muted/40"
            />
          </div>
          <CommandList className="max-h-[min(22rem,50vh)]">
            <CommandEmpty className="py-6 text-center font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
              No driver found.
            </CommandEmpty>
            <CommandGroup className="p-1">
              {availableDrivers.map((driver) => (
                <CommandItem
                  key={driver.driverNumber}
                  value={getDriverSearchValue(driver)}
                  onSelect={() => {
                    onChange(driver.driverNumber);
                    setOpen(false);
                  }}
                  className="rounded-sm px-3 py-2.5 data-[selected=true]:bg-paddock-surface-highest"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-sm">
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
                      <div className="truncate font-display text-sm font-bold text-paddock-on">
                        {driver.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative h-3 w-3 shrink-0 overflow-hidden rounded-sm">
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
                        <span className="truncate font-display text-[10px] uppercase tracking-widest text-paddock-on-muted">
                          {driver.teamName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0 text-paddock-cyan",
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
