import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";

interface PhoneInputProps {
  dialCode: string;
  phone: string;
  onDialCodeChange: (code: string) => void;
  onPhoneChange: (phone: string) => void;
}

export default function PhoneInput({ dialCode, phone, onDialCodeChange, onPhoneChange }: PhoneInputProps) {
  const [open, setOpen] = useState(false);

  const selected = COUNTRIES.find((c) => c.dialCode === dialCode);

  return (
    <div className="flex gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[120px] justify-between px-2 font-normal shrink-0"
          >
            <span className="truncate text-sm">
              {selected ? `${getFlagEmoji(selected.code)} ${selected.dialCode}` : dialCode}
            </span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar país ou código..." />
            <CommandList>
              <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.dialCode}`}
                    onSelect={() => {
                      onDialCodeChange(country.dialCode);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        dialCode === country.dialCode ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2">{getFlagEmoji(country.code)}</span>
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{country.dialCode}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        placeholder="11 99999-9999"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        className="flex-1"
      />
    </div>
  );
}
