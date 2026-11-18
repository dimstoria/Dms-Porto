import {type FormEvent} from 'react';
import {Check} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {CUBIC_MICRO, LIQUID_SPRING_SNAPPY} from '../lib/motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import {VerticalScrollFade} from './VerticalScrollFade';
import {PROJECT_SCOPES} from '../data/portfolio';

interface FormErrors {
  name?: string;
  email?: string;
  notes?: string;
}

interface MobileBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  formEmail: string;
  formScope: string;
  formNotes: string;
  formErrors?: FormErrors;
  isSubmitting?: boolean;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onScopeChange: (val: string) => void;
  onNotesChange: (val: string) => void;
  onSubmit: (e: FormEvent) => Promise<boolean>;
}

export function MobileBookingSheet({
  open,
  onOpenChange,
  formName,
  formEmail,
  formScope,
  formNotes,
  formErrors = {},
  isSubmitting = false,
  onNameChange,
  onEmailChange,
  onScopeChange,
  onNotesChange,
  onSubmit,
}: MobileBookingSheetProps) {
  const handleFormSubmit = async (e: FormEvent) => {
    const ok = await onSubmit(e);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 max-h-[88dvh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] bg-[#FFFDF5]"
      >
        <div className="pt-2 pb-1 shrink-0">
          <div aria-hidden="true" className="w-12 h-2 bg-[#09090B] rounded-full mx-auto my-2" />
        </div>

        <VerticalScrollFade className="flex-1 min-h-0 px-5 pb-7">
          <SheetHeader className="p-0 text-left mb-5 space-y-1">
            <SheetTitle className="font-display text-2xl font-extrabold tracking-tight text-[#09090B]">
              Send Project Brief
            </SheetTitle>
            <SheetDescription className="text-xs font-medium text-zinc-700">
              Share your shoot dates or editing timeline. Typical response within 24 hours.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="mobile-inquiry-name" className="block text-xs font-mono font-bold text-[#09090B]">
                Your Name
              </label>
              <input
                id="mobile-inquiry-name"
                type="text"
                autoComplete="name"
                value={formName}
                onChange={(e) => onNameChange(e.target.value)}
                aria-invalid={Boolean(formErrors.name)}
                aria-describedby={formErrors.name ? 'mobile-inquiry-name-error' : undefined}
                placeholder="Your name"
                className={`brutal-input w-full h-11 rounded-xl px-3.5 text-base sm:text-sm focus:outline-none ${
                  formErrors.name ? 'border-[#E11D48] bg-[#FFE4E6]' : ''
                }`}
              />
              {formErrors.name && (
                <p id="mobile-inquiry-name-error" role="alert" className="text-xs font-mono font-bold text-[#E11D48]">
                  {formErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mobile-inquiry-email" className="block text-xs font-mono font-bold text-[#09090B]">
                Email Address
              </label>
              <input
                id="mobile-inquiry-email"
                type="email"
                autoComplete="email"
                value={formEmail}
                onChange={(e) => onEmailChange(e.target.value)}
                aria-invalid={Boolean(formErrors.email)}
                aria-describedby={formErrors.email ? 'mobile-inquiry-email-error' : undefined}
                placeholder="you@studio.com"
                className={`brutal-input w-full h-11 rounded-xl px-3.5 text-base sm:text-sm focus:outline-none ${
                  formErrors.email ? 'border-[#E11D48] bg-[#FFE4E6]' : ''
                }`}
              />
              {formErrors.email && (
                <p id="mobile-inquiry-email-error" role="alert" className="text-xs font-mono font-bold text-[#E11D48]">
                  {formErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <span id="mobile-scope-label" className="block text-xs font-mono font-bold text-[#09090B]">
                Project Scope
              </span>
              <div
                role="radiogroup"
                aria-labelledby="mobile-scope-label"
                className="flex flex-wrap gap-2"
              >
                {PROJECT_SCOPES.map((scope) => {
                  const selected = formScope === scope;
                  return (
                    <motion.button
                      key={scope}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      whileTap={{scale: 0.96}}
                      transition={LIQUID_SPRING_SNAPPY}
                      onClick={() => onScopeChange(scope)}
                      className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                        selected ? 'brutal-cta' : 'brutal-button'
                      }`}
                    >
                      <AnimatePresence initial={false}>
                        {selected && (
                          <motion.span
                            key="scope-check"
                            aria-hidden="true"
                            initial={{opacity: 0, scale: 0.6}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0.6}}
                            transition={CUBIC_MICRO}
                            className="inline-flex"
                          >
                            <Check className="w-3 h-3" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <span>{scope}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mobile-inquiry-notes" className="block text-xs font-mono font-bold text-[#09090B]">
                Brief &amp; Timeline
              </label>
              <textarea
                id="mobile-inquiry-notes"
                rows={3}
                value={formNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                aria-invalid={Boolean(formErrors.notes)}
                aria-describedby={formErrors.notes ? 'mobile-inquiry-notes-error' : undefined}
                placeholder="Shoot dates, deliverables, or visual references..."
                className={`brutal-input w-full rounded-xl px-3.5 py-2.5 text-base sm:text-sm focus:outline-none ${
                  formErrors.notes ? 'border-[#E11D48] bg-[#FFE4E6]' : ''
                }`}
              />
              {formErrors.notes && (
                <p id="mobile-inquiry-notes-error" role="alert" className="text-xs font-mono font-bold text-[#E11D48]">
                  {formErrors.notes}
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileTap={{scale: 0.975}}
              transition={LIQUID_SPRING_SNAPPY}
              className="brutal-cta w-full h-12 rounded-xl text-sm font-mono font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending Brief...' : 'Send Project Brief'}
            </motion.button>
          </form>
        </VerticalScrollFade>
      </SheetContent>
    </Sheet>
  );
}
