import { WritableSignal } from "@angular/core"

export class AvailableLocation {
  Id!: number
	Name!: string
	Address!: string
  Distance!: number
  MapUrl!: string
  selected!: WritableSignal<boolean>
}