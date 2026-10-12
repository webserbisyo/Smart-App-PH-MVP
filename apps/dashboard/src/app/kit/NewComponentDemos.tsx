import { Button } from '@smartapp/ui/components/button';
import { Progress, ProgressLabel, ProgressValue } from '@smartapp/ui/components/progress';
import { QRCode, QRCodeDownload, QRCodeImage, QRCodeOverlay, QRCodeSkeleton } from '@smartapp/ui/components/qr-code';
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@smartapp/ui/components/responsive-dialog';
import { Scroller } from '@smartapp/ui/components/scroller';
import { Stat, StatDescription, StatIndicator, StatLabel, StatValue } from '@smartapp/ui/components/stat';
import { Status, StatusIndicator, StatusLabel } from '@smartapp/ui/components/status';
import { IconCash, IconDownload, IconReceipt, IconUsers } from '@smartapp/ui/icons';

import { Demo } from './Demo';

// Sample text here is kit-only demo content (a developer page), not app copy.

const CHIPS = ['All', 'Coffee', 'Milk tea', 'Pastries', 'Rice meals', 'Pasta', 'Sandwiches', 'Desserts', 'Drinks', 'Add-ons'];

/** The six components added in P4.0 (kit total 57). */
export function NewComponentDemos() {
  return (
    <>
      <Demo name="Status">
        {() => (
          <div className="flex flex-wrap gap-2">
            <Status variant="success">
              <StatusIndicator pulse />
              <StatusLabel>Open</StatusLabel>
            </Status>
            <Status variant="neutral">
              <StatusIndicator />
              <StatusLabel>Closed</StatusLabel>
            </Status>
            <Status variant="warning">
              <StatusIndicator />
              <StatusLabel>To verify</StatusLabel>
            </Status>
            <Status variant="danger">
              <StatusIndicator />
              <StatusLabel>Late</StatusLabel>
            </Status>
            <Status variant="info">
              <StatusIndicator />
              <StatusLabel>New</StatusLabel>
            </Status>
            <Status variant="member">
              <StatusIndicator />
              <StatusLabel>Member</StatusLabel>
            </Status>
          </div>
        )}
      </Demo>

      <Demo name="Progress">
        {() => (
          <div className="flex w-full max-w-sm flex-col gap-4">
            <Progress value={70}>
              <ProgressLabel>Upload</ProgressLabel>
              <ProgressValue />
            </Progress>
            <Progress value={null} aria-label="Working" />
          </div>
        )}
      </Demo>

      <Demo name="Stat">
        {() => (
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <Stat>
              <StatLabel>Sales today</StatLabel>
              <StatIndicator color="success">
                <IconCash />
              </StatIndicator>
              <StatValue className="tabular">₱12,345</StatValue>
              <StatDescription>Paid orders only</StatDescription>
            </Stat>
            <Stat>
              <StatLabel>Orders</StatLabel>
              <StatIndicator color="info">
                <IconReceipt />
              </StatIndicator>
              <StatValue className="tabular">42</StatValue>
            </Stat>
            <Stat>
              <StatLabel>Members</StatLabel>
              <StatIndicator color="member">
                <IconUsers />
              </StatIndicator>
              <StatValue className="tabular">128</StatValue>
            </Stat>
          </div>
        )}
      </Demo>

      <Demo name="Scroller">
        {() => (
          <Scroller orientation="horizontal" hideScrollbar withNavigation className="flex w-full gap-2 py-1">
            {CHIPS.map((chip) => (
              <span key={chip} className="shrink-0 rounded-full border border-border px-4 py-2 text-sm">
                {chip}
              </span>
            ))}
          </Scroller>
        )}
      </Demo>

      <Demo name="QR code">
        {() => (
          <div className="flex flex-wrap items-end gap-4">
            <QRCode value="https://shop.webserbisyo.com/juans-cafe" size={160}>
              <QRCodeSkeleton />
              <QRCodeImage alt="QR code for Juan's Cafe" />
              <QRCodeDownload filename="juans-cafe" render={<Button variant="outline" size="sm" />}>
                <IconDownload aria-hidden="true" />
                Download
              </QRCodeDownload>
            </QRCode>
            <QRCode value="https://shop.webserbisyo.com/tala-apparel" size={120} level="H">
              <QRCodeSkeleton />
              <QRCodeImage alt="QR code for Tala Apparel" />
              <QRCodeOverlay className="size-8 text-xs font-bold">TA</QRCodeOverlay>
            </QRCode>
          </div>
        )}
      </Demo>

      <Demo name="Responsive dialog">
        {() => (
          <div className="flex flex-wrap gap-2">
            <ResponsiveDialog>
              <ResponsiveDialogTrigger render={<Button variant="outline" />}>Dialog / sheet</ResponsiveDialogTrigger>
              <ResponsiveDialogContent>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>Cancel order #042?</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>A sheet on phones, a dialog on wider screens.</ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <ResponsiveDialogFooter>
                  <ResponsiveDialogClose render={<Button variant="outline" />}>Keep</ResponsiveDialogClose>
                  <ResponsiveDialogClose render={<Button variant="destructive" />}>Cancel order</ResponsiveDialogClose>
                </ResponsiveDialogFooter>
              </ResponsiveDialogContent>
            </ResponsiveDialog>
            <ResponsiveDialog desktop="right">
              <ResponsiveDialogTrigger render={<Button variant="outline" />}>Right drawer / sheet</ResponsiveDialogTrigger>
              <ResponsiveDialogContent>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>Your cart</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>A sheet on phones, a drawer on the right on wider screens.</ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <ResponsiveDialogFooter>
                  <ResponsiveDialogClose render={<Button />}>Close</ResponsiveDialogClose>
                </ResponsiveDialogFooter>
              </ResponsiveDialogContent>
            </ResponsiveDialog>
          </div>
        )}
      </Demo>
    </>
  );
}
