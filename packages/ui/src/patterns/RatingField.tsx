'use client';

import { useState } from 'react';

import { Button } from '#components/button';
import { Field, FieldDescription, FieldLabel } from '#components/field';
import { Spinner } from '#components/spinner';
import { Textarea } from '#components/textarea';
import { IconStar } from '../icons';
import { cn } from '#lib/utils';

export interface RatingFieldWords {
  title?: string;
  hint?: string;
  commentPlaceholder?: string;
  submit?: string;
  submitting?: string;
  sent?: string;
  yourRating?: string;
  starsLabel?: (stars: number) => string;
}

export interface RatingFieldProps {
  /** If provided, renders read-only display. */
  readOnly?: boolean;
  stars?: number | null;
  comment?: string | null;
  onSubmit?: (stars: number, comment: string | null) => void;
  submitting?: boolean;
  words?: RatingFieldWords;
  className?: string;
}

export function RatingField({
  readOnly = false,
  stars: initialStars = null,
  comment: initialComment = null,
  onSubmit,
  submitting = false,
  words,
  className,
}: RatingFieldProps) {
  const [selectedStars, setSelectedStars] = useState<number>(initialStars ?? 0);
  const [hoveredStars, setHoveredStars] = useState<number>(0);
  const [commentText, setCommentText] = useState(initialComment ?? '');

  const displayStars = readOnly ? (initialStars ?? 0) : hoveredStars || selectedStars;

  if (readOnly) {
    if (initialStars === null || initialStars === 0) {
      return (
        <div className={cn('flex flex-col gap-1 text-sm text-muted-foreground', className)}>
          <p>{words?.hint ?? 'No customer rating yet.'}</p>
        </div>
      );
    }
    return (
      <div className={cn('flex flex-col gap-2 rounded-xl border border-border/60 bg-shop-30 p-4 shadow-xs', className)}>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <IconStar
              key={star}
              aria-hidden="true"
              className={cn(
                'size-5 transition-colors',
                star <= initialStars ? 'fill-amber-400 text-amber-400' : 'fill-muted/30 text-muted-foreground/40',
              )}
            />
          ))}
          <span className="ml-1.5 text-sm font-bold text-foreground">
            {initialStars} / 5
          </span>
        </div>
        {initialComment && (
          <p className="text-sm text-foreground/90 italic bg-background/50 rounded-lg p-2.5 border border-border/40">
            &ldquo;{initialComment}&rdquo;
          </p>
        )}
      </div>
    );
  }

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (selectedStars === 0 || submitting) return;
    onSubmit?.(selectedStars, commentText.trim() === '' ? null : commentText.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex flex-col gap-4 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs', className)}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-foreground">{words?.title ?? 'Rate your order'}</h3>
        <p className="text-xs text-muted-foreground">{words?.hint ?? 'Your rating is private and helps the shop improve.'}</p>
      </div>

      <div className="flex items-center gap-2 py-1" role="radiogroup" aria-label={words?.title ?? 'Rating'}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={selectedStars === star}
            aria-label={`${String(star)} star${star === 1 ? '' : 's'}`}
            disabled={submitting}
            onMouseEnter={() => {
              setHoveredStars(star);
            }}
            onMouseLeave={() => {
              setHoveredStars(0);
            }}
            onClick={() => {
              setSelectedStars(star);
            }}
            className="group p-1 rounded-lg outline-none transition-transform hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconStar
              aria-hidden="true"
              className={cn(
                'size-8 transition-colors',
                star <= displayStars ? 'fill-amber-400 text-amber-400' : 'fill-muted/30 text-muted-foreground/40',
              )}
            />
          </button>
        ))}
        {selectedStars > 0 && (
          <span className="ml-2 text-sm font-semibold tabular text-foreground">
            {words?.starsLabel ? words.starsLabel(selectedStars) : `${String(selectedStars)} of 5`}
          </span>
        )}
      </div>

      <Field>
        <FieldLabel htmlFor="rating-comment" className="sr-only">
          Comment
        </FieldLabel>
        <Textarea
          id="rating-comment"
          value={commentText}
          onChange={(e) => {
            setCommentText(e.target.value);
          }}
          maxLength={300}
          placeholder={words?.commentPlaceholder ?? 'Leave a note for the shop (optional)...'}
          className="resize-none text-sm min-h-[72px]"
          disabled={submitting}
        />
        <FieldDescription className="text-right text-[11px]">
          {commentText.length}/300
        </FieldDescription>
      </Field>

      <Button
        type="submit"
        variant="shop"
        size="lg"
        disabled={selectedStars === 0 || submitting}
        className="w-full sm:w-auto self-end font-bold"
      >
        {submitting ? (
          <>
            <Spinner className="mr-1.5 size-4" />
            {words?.submitting ?? 'Submitting...'}
          </>
        ) : (
          words?.submit ?? 'Submit rating'
        )}
      </Button>
    </form>
  );
}
