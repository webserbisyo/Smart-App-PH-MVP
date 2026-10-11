import { useId, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@smartapp/ui/components/alert-dialog';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { Badge } from '@smartapp/ui/components/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@smartapp/ui/components/breadcrumb';
import { Button } from '@smartapp/ui/components/button';
import { ButtonGroup } from '@smartapp/ui/components/button-group';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@smartapp/ui/components/card';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@smartapp/ui/components/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@smartapp/ui/components/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@smartapp/ui/components/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@smartapp/ui/components/empty';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@smartapp/ui/components/input-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@smartapp/ui/components/input-otp';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@smartapp/ui/components/item';
import { Label } from '@smartapp/ui/components/label';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { ScrollArea, ScrollBar } from '@smartapp/ui/components/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@smartapp/ui/components/select';
import { Separator } from '@smartapp/ui/components/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@smartapp/ui/components/sheet';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Switch } from '@smartapp/ui/components/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@smartapp/ui/components/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { Textarea } from '@smartapp/ui/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@smartapp/ui/components/tooltip';
import { toast } from '@smartapp/ui/components/sonner';
import { IconChevronRight, IconPackage, IconReceipt, IconUser } from '@smartapp/ui/icons';

import { Demo } from './Demo';

// Sample text here is kit-only demo content (a developer page), not app copy.

function FieldDemo() {
  const id = useId();
  return (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor={id}>Shop name</FieldLabel>
      <Input id={id} placeholder="Juan's Café" />
      <FieldDescription>Shown on your shop link.</FieldDescription>
    </Field>
  );
}

function ChoicesDemo() {
  const id = useId();
  return (
    <div className="flex flex-col gap-4">
      <RadioGroup defaultValue="pickup">
        {['walk_in', 'pickup', 'delivery'].map((value) => (
          <div key={value} className="flex items-center gap-3">
            <RadioGroupItem value={value} id={`${id}-${value}`} />
            <Label htmlFor={`${id}-${value}`}>{value}</Label>
          </div>
        ))}
      </RadioGroup>
      <div className="flex items-center gap-3">
        <Checkbox id={`${id}-cb`} defaultChecked />
        <Label htmlFor={`${id}-cb`}>Extra shot</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id={`${id}-sw`} defaultChecked />
        <Label htmlFor={`${id}-sw`}>Accepting orders</Label>
      </div>
    </div>
  );
}

function CalendarDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  return <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-xl border border-border" />;
}

function CollapsibleDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-sm">
      <CollapsibleTrigger render={<Button variant="outline" />}>{open ? 'Hide details' : 'Show details'}</CollapsibleTrigger>
      <CollapsibleContent className="pt-2 text-sm text-muted-foreground">Order #1042 · Pickup · ₱240</CollapsibleContent>
    </Collapsible>
  );
}

const ROWS = [
  { name: 'Iced Latte', qty: 12, total: '₱1,440' },
  { name: 'Ube Cheese Pandesal', qty: 30, total: '₱900' },
];

/** The 39 shadcn components, each in light and dark. */
export function BasicDemos() {
  return (
    <>
      <Demo name="button">
        {() => (
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">Link</Button>
          </div>
        )}
      </Demo>
      <Demo name="button-group">
        {() => (
          <ButtonGroup>
            <Button variant="outline" size="icon" aria-label="Less">−</Button>
            <Button variant="outline" className="tabular">2</Button>
            <Button variant="outline" size="icon" aria-label="More">+</Button>
          </ButtonGroup>
        )}
      </Demo>
      <Demo name="input, label, field">{() => <FieldDemo />}</Demo>
      <Demo name="input-group">
        {() => (
          <InputGroup className="max-w-sm">
            <InputGroupAddon>
              <InputGroupText>₱</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput inputMode="decimal" placeholder="0.00" aria-label="Price" />
          </InputGroup>
        )}
      </Demo>
      <Demo name="textarea">{() => <Textarea className="max-w-sm" placeholder="Notes for the shop" aria-label="Notes" />}</Demo>
      <Demo name="input-otp">
        {() => (
          <InputOTP maxLength={6} inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code">
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        )}
      </Demo>
      <Demo name="select, native-select">
        {() => (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <Select defaultValue="gcash">
              <SelectTrigger className="w-full" aria-label="Payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="maya">Maya</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>
            <NativeSelect defaultValue="cebu" aria-label="City">
              <NativeSelectOption value="manila">Manila</NativeSelectOption>
              <NativeSelectOption value="cebu">Cebu City</NativeSelectOption>
              <NativeSelectOption value="davao">Davao City</NativeSelectOption>
            </NativeSelect>
          </div>
        )}
      </Demo>
      <Demo name="radio-group, checkbox, switch">{() => <ChoicesDemo />}</Demo>
      <Demo name="toggle-group">
        {() => (
          <ToggleGroup defaultValue={['today']} variant="outline" aria-label="Range">
            <ToggleGroupItem value="today">Today</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
          </ToggleGroup>
        )}
      </Demo>
      <Demo name="tabs">
        {() => (
          <Tabs defaultValue="new" className="w-full">
            <TabsList>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="preparing">Preparing</TabsTrigger>
              <TabsTrigger value="ready">Ready</TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="pt-2 text-sm">2 new orders</TabsContent>
            <TabsContent value="preparing" className="pt-2 text-sm">1 preparing</TabsContent>
            <TabsContent value="ready" className="pt-2 text-sm">None ready</TabsContent>
          </Tabs>
        )}
      </Demo>
      <Demo name="card">
        {() => (
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Today&apos;s sales</CardTitle>
              <CardDescription>12 orders</CardDescription>
            </CardHeader>
            <CardContent className="tabular text-2xl font-bold">₱4,280</CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                See orders
              </Button>
            </CardFooter>
          </Card>
        )}
      </Demo>
      <Demo name="badge">
        {() => (
          <div className="flex flex-wrap gap-2">
            <Badge>Placed</Badge>
            <Badge variant="secondary">Preparing</Badge>
            <Badge variant="outline">Unpaid</Badge>
            <Badge className="bg-member text-member-foreground">Member</Badge>
            <Badge variant="destructive">Cancelled</Badge>
          </div>
        )}
      </Demo>
      <Demo name="avatar">
        {() => (
          <Avatar>
            <AvatarFallback>JC</AvatarFallback>
          </Avatar>
        )}
      </Demo>
      <Demo name="separator, skeleton, spinner">
        {() => (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator />
            <Spinner className="size-6" />
          </div>
        )}
      </Demo>
      <Demo name="empty">
        {() => (
          <Empty className="w-full border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconReceipt />
              </EmptyMedia>
              <EmptyTitle>No orders yet</EmptyTitle>
              <EmptyDescription>New orders will show up here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Demo>
      <Demo name="sheet, drawer">
        {() => (
          <div className="flex flex-wrap gap-2">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Cart</SheetTitle>
                </SheetHeader>
              </SheetContent>
            </Sheet>
            <Drawer showSwipeHandle>
              <DrawerTrigger render={<Button variant="outline" />}>Open drawer</DrawerTrigger>
              <DrawerContent className="pb-safe">
                <DrawerHeader>
                  <DrawerTitle>Iced Latte</DrawerTitle>
                </DrawerHeader>
                <p className="px-4 pb-6 text-muted-foreground">Swipe down to close.</p>
              </DrawerContent>
            </Drawer>
          </div>
        )}
      </Demo>
      <Demo name="dialog, alert-dialog">
        {() => (
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" />}>View proof</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Payment proof</DialogTitle>
                  <DialogDescription>GCash ref 1234 5678 9012</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" />}>Cancel order</AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                  <AlertDialogDescription>The customer is told right away.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction>Cancel order</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </Demo>
      <Demo name="dropdown-menu, popover, tooltip">
        {() => (
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>Actions</DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Mark sold out</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>Help</PopoverTrigger>
              <PopoverContent>Members collect one stamp per order.</PopoverContent>
            </Popover>
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" />}>Hover me</TooltipTrigger>
              <TooltipContent>A short hint</TooltipContent>
            </Tooltip>
          </div>
        )}
      </Demo>
      <Demo name="sonner">
        {() => (
          <Button
            variant="outline"
            onClick={() => {
              toast.success('Order marked ready');
            }}
          >
            Show a toast
          </Button>
        )}
      </Demo>
      <Demo name="sidebar">{() => <p className="text-sm text-muted-foreground">The dashboard&apos;s own sidebar and icon rail (left, on tablets and desktops) are this component.</p>}</Demo>
      <Demo name="breadcrumb">
        {() => (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#kit">Orders</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>#1042</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </Demo>
      <Demo name="scroll-area">
        {() => (
          <ScrollArea className="w-full max-w-sm whitespace-nowrap">
            <div className="flex gap-2 pb-3">
              {['Coffee', 'Milk tea', 'Pastries', 'Rice meals', 'Desserts', 'Drinks', 'Add-ons'].map((name) => (
                <Badge key={name} variant="outline" className="h-9 px-3">
                  {name}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </Demo>
      <Demo name="table">
        {() => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="tabular text-right">{row.qty}</TableCell>
                  <TableCell className="tabular text-right">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Demo>
      <Demo name="calendar">{() => <CalendarDemo />}</Demo>
      <Demo name="collapsible">{() => <CollapsibleDemo />}</Demo>
      <Demo name="alert">
        {() => (
          <Alert className="max-w-sm">
            <AlertTitle>Shop is closed</AlertTitle>
            <AlertDescription>Opens tomorrow at 7:00 AM.</AlertDescription>
          </Alert>
        )}
      </Demo>
      <Demo name="item">
        {() => (
          <Item variant="outline" className="w-full max-w-sm">
            <ItemMedia variant="icon">
              <IconUser />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Maria Santos</ItemTitle>
              <ItemDescription>Member · 7 stamps</ItemDescription>
            </ItemContent>
            <ItemActions>
              <IconChevronRight className="size-4" />
            </ItemActions>
          </Item>
        )}
      </Demo>
      <Demo name="icons (Tabler)">
        {() => (
          <div className="flex gap-3 [&>svg]:size-6">
            <IconPackage />
            <IconReceipt />
            <IconUser />
          </div>
        )}
      </Demo>
    </>
  );
}
