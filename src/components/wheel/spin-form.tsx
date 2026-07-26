'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SpinFormProps {
  codeValue: string;
  onSubmit: (name: string, phone: string) => void;
  onCancel: () => void;
}

export function SpinForm({ codeValue, onSubmit, onCancel }: SpinFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  function handleSubmit() {
    onSubmit(name, phone);
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-[#1a1a2e] border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">📝 Informations</DialogTitle>
          <DialogDescription className="text-white/60">
            Code : <span className="font-mono text-amber-400">{codeValue}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="participant-name" className="text-white/80">Nom (optionnel)</Label>
            <Input
              id="participant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="participant-phone" className="text-white/80">Téléphone (optionnel)</Label>
            <Input
              id="participant-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Votre numéro"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Passer
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-amber-400 to-red-500 text-white font-semibold"
          >
            Continuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
