---
title: Settings
---

# Settings
@stack gap=8

## Profile
@card
@form submit="saveProfile"
Input name="displayName" label="Display name" placeholder="Vlad"
Input name="email" label="Email" type="email"
Button type="submit"
  Save changes

## Billing
@card
Badge variant="secondary"
  Pro plan
Text tone="muted"
  Your next invoice is due on {{ billing.nextInvoiceDate }}.
Button variant="outline" action="openBillingPortal"
  Manage billing

## Notifications
@card
@form submit="saveNotifications"
Switch name="emailNotifications" label="Email notifications"
Switch name="weeklyDigest" label="Weekly digest"
Button type="submit"
  Save preferences

## Danger Zone
@card variant="destructive"
Text tone="muted"
  Deleting your workspace is permanent and cannot be undone.
Button variant="destructive" action="deleteWorkspace"
  Delete workspace
