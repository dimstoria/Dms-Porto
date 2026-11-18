import {type FormEvent} from 'react';
import {Check, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {CUBIC_MICRO, LIQUID_SPRING_SNAPPY} from '../lib/motion';
import {
  Sheet,
  SheetClose,
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
        showCloseButton={false}
        className="rounded-t-3xl p-0 max-h-[88dvh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] bg-[#FFFDF5]"
      >
        <div className="relative px-4 py-2.5 shrink-0 bg-[#FFE600] border-b-[2.5px] border-[#09090B] flex items-center justify-center">
          <div aria-hidden="true" className="w-12 h-1.5 bg-[#09090B]/35 rounded-full" />
          <SheetClose
            render={
              <button
                type="button"
                aria-label="Close booking form"
                className="brutal-button absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#09090B] cursor-pointer"
              />
            }
          >
            <X className="w-4 h-4" strokeWidth={2.25} />
          </SheetClose>
        </div>

        <VerticalScrollFade className="flex-1 min-h-0 px-5 pt-4 pb-7">
          <SheetHeader className="p-0 text-left mb-5 space-y-1">
            <SheetTitle className="font-display text-2xl font-extrabold tracking-tight text-[#09090B]">
              Send Project Brief
            </SheetTitle>
            <SheetDescription className="text-xs font-sans text-[#3F3F46]">
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
                  formErrors.name ? 'border-[#FF4D8D]' : ''
                }`}
              />
              {formErrors.name && (
                <p id="mobile-inquiry-name-error" role="alert" className="rounded-lg bg-[#FF4D8D] border-2 border-[#09090B] px-2.5 py-1 text-xs font-mono font-bold text-[#09090B]">
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
                  formErrors.email ? 'border-[#FF4D8D]' : ''
                }`}
              />
              {formErrors.email && (
                <p id="mobile-inquiry-email-error" role="alert" className="rounded-lg bg-[#FF4D8D] border-2 border-[#09090B] px-2.5 py-1 text-xs font-mono font-bold text-[#09090B]">
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
                      className={`inline-flex items-center gap-1.5 min-h-[44px] rounded-xl px-4 py-2 text-xs font-mono font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
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
                            <Check className="w-3 h-3" strokeWidth={2.5} />
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
                  formErrors.notes ? 'border-[#FF4D8D]' : ''
                }`}
              />
              {formErrors.notes && (
                <p id="mobile-inquiry-notes-error" role="alert" className="rounded-lg bg-[#FF4D8D] border-2 border-[#09090B] px-2.5 py-1 text-xs font-mono font-bold text-[#09090B]">
                  {formErrors.notes}
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileTap={{scale: 0.975}}
              transition={LIQUID_SPRING_SNAPPY}
              className="brutal-cta w-full h-12 rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending Brief...' : 'Send Project Brief'}
            </motion.button>
          </form>
        </VerticalScrollFade>
      </SheetContent>
    </Sheet>
  );
}
