# Weekday-to-Category Schedule Design

**Date:** 2026-06-07
**Status:** Approved

---

## Problem

A client case can involve multiple service types on different days of the week — e.g. Transportation every Wednesday, Supervised Visitation every Thursday. The current intake form has no way to record this schedule. When an admin creates a shift for that client, they must manually pick the shift category every time, with no guidance from the intake data.

Additionally, within a multi-client family, only some clients may participate in each service (e.g. 2 of 4 siblings have transportation). The intake form already records which clients belong to each service via `clientName` fields on `transportationInfoList` and `supervisedVisitations` entries, but this is not used during shift creation.

---

## Goals

1. Let the intake form record which weekdays each service type runs on.
2. Auto-fill `shiftCategory` in Add Shift when a picked date matches a configured weekday.
3. Warn (but don't block) when a picked date has no configured service.
4. Auto-filter shift points to only the clients relevant to the resolved category.

---

## Out of Scope

- Emergent Care and Respite Care do not get weekday rows — they use the existing Service Dates calendar.
- This feature only applies in Add mode (not Edit mode).
- No changes to mobile app in this iteration.

---

## Data Model

Two new optional arrays added inside the `services` object on the intake/client Firestore document:

```js
services: {
  serviceType: [...],               // existing — array of shiftCategory IDs
  serviceDates: [...],              // existing — array of "YYYY-MM-DD"
  transportationDays: [3],          // NEW — weekday numbers: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  supervisedVisitationDays: [4],    // NEW — same format
}
```

- Both fields are optional arrays. If absent or empty, behaviour is unchanged (backward compatible).
- Stored at case level (not per-client-sibling) — the per-client filtering is derived from the existing `clientName` fields in `transportationInfoList` / `supervisedVisitations`.
- When the intake form is saved, these arrays are written to Firestore alongside all other `services` fields and synced to the client document.

---

## Intake Form Changes (`IntakeForm.jsx`)

### Initial State
```js
services: {
  ...existing fields,
  transportationDays: [],
  supervisedVisitationDays: [],
}
```

### Load / Save
- On load: read `raw.services?.transportationDays` and `raw.services?.supervisedVisitationDays` (default to `[]` if absent).
- On save: write both arrays inside the `services` object, and mirror to the client document.

### UI — Services Card

Below the "Types of Services" multi-select, add conditional weekday picker rows:

- **"Transportation Days"** row — shown only when Transportation is among the selected service types.
- **"Supervised Visitation Days"** row — shown only when Supervised Visitation is among the selected service types.
- Each row is 7 pill buttons: **Mon Tue Wed Thu Fri Sat Sun** (display order, Mon first).
- Pills toggle on/off, multi-select. Selected pill: filled green (`#145228`). Unselected: grey outline.
- Rows appear/disappear reactively as service types are checked/unchecked. If a service type is deselected, its weekday array is cleared.
- Both rows can be visible simultaneously.

Visual layout:
```
Transportation Days        [ Mon ] [ Tue ] [Wed✓] [ Thu ] [ Fri ] [ Sat ] [ Sun ]
Supervised Visitation Days [ Mon ] [ Tue ] [ Wed ] [Thu✓] [ Fri ] [ Sat ] [ Sun ]
```

---

## Shift Creation Changes (`AddUserShift.jsx`)

### Trigger
A `useEffect` that watches `[selectedClient, values.shiftDates]`. Runs only in Add mode (`mode !== "update"`). Runs only when `selectedClient` has at least one of `transportationDays` or `supervisedVisitationDays` non-empty.

### Category Resolution Logic

For each selected date:
1. Get `dayOfWeek = date.getDay()` (0–6).
2. Check `transportationDays`: if `dayOfWeek` is in the array → resolved category = `"Transportation"`.
3. Else check `supervisedVisitationDays`: if `dayOfWeek` is in the array → resolved category = `"Supervised Visitation"`.
4. Else → no match.

When **all selected dates resolve to the same category**: auto-fill `shiftCategory` with that category and call `setSelectedShiftCategory`.

When **dates resolve to mixed or no match**: show a yellow inline warning banner below the date picker — *"⚠ No service is scheduled on [Weekday]s for this client. Please select the category manually."* — and leave shiftCategory unchanged.

The warning clears when:
- The admin manually selects a category, or
- All selected dates match a configured weekday.

This logic runs **after** the existing category-resolution logic, overriding it only when weekday schedule data is present on the client.

### Shift Point Filtering

After the category is resolved (either by weekday logic or manually), filter the shift points by category:

- **Transportation** resolved → only include clients whose `fullName` appears in any entry of `selectedClient.transportationInfoList`.
- **Supervised Visitation** resolved → only include clients whose `fullName` appears in any entry of `selectedClient.supervisedVisitations`.
- **Other categories** (Emergent Care, Respite Care) → no filtering, all clients included as before.

Clients filtered out are not loaded into `shiftPoints`. Admin can still add them back via the existing "Add back" UI.

### State
Add one new piece of UI state: `const [categoryWarning, setCategoryWarning] = useState("")`

Displayed as a yellow banner below the date selector when non-empty. Cleared on manual category selection or when warning condition resolves.

---

## Firestore Write (Intake Save)

The existing intake save already writes `services` as an object. Add the two new fields to that write:

```js
services: {
  ...existing services fields,
  transportationDays: values.services.transportationDays || [],
  supervisedVisitationDays: values.services.supervisedVisitationDays || [],
}
```

Also mirror to the client document's `services` field (same place `serviceType` is already synced).

---

## Backward Compatibility

- Existing intake forms without `transportationDays` / `supervisedVisitationDays` behave exactly as before — the weekday logic only activates when at least one array is non-empty.
- No migration needed.
- No mobile app changes needed.
