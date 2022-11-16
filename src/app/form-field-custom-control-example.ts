import { FocusMonitor } from '@angular/cdk/a11y';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  Inject,
  Input,
  LOCALE_ID,
  OnDestroy,
  Optional,
  Self,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NgControl,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  MAT_FORM_FIELD,
  MatFormField,
  MatFormFieldControl,
} from '@angular/material/form-field';
import { Subject } from 'rxjs';

/** @title Form field with custom telephone number input control. */
@Component({
  selector: 'form-field-custom-control-example',
  templateUrl: 'form-field-custom-control-example.html',
})
export class FormFieldCustomControlExample {
  constructor(@Inject(LOCALE_ID) public locale: string) {}
  form: FormGroup = new FormGroup({
    tel: new FormControl('123.456', [
      localizedNumberValidator(this.locale),
      Validators.pattern('d'),
    ]),
  });

  setvalue() {
    this.form.controls.tel.setValue('4.123');
  }
}

/** Custom `MatFormFieldControl` for telephone number input. */
@Component({
  selector: 'example-tel-input',
  templateUrl: 'example-tel-input-example.html',
  styleUrls: ['example-tel-input-example.css'],
  providers: [{ provide: MatFormFieldControl, useExisting: MyTelInput }],
  host: {
    '[class.example-floating]': 'shouldLabelFloat',
    '[id]': 'id',
  },
})
export class MyTelInput
  implements ControlValueAccessor, MatFormFieldControl<number>, OnDestroy
{
  static nextId = 0;
  @ViewChild('area') areaInput: HTMLInputElement;

  number = new FormControl('', [Validators.required]);
  stateChanges = new Subject<void>();
  focused = false;
  touched = false;
  controlType = 'example-tel-input';
  id = `example-tel-input-${MyTelInput.nextId++}`;
  onChange = (_: any) => {};
  onTouched = () => {};

  get empty() {
    return !this.number;
  }

  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  @Input('aria-describedby') userAriaDescribedBy: string;

  @Input()
  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(value: string) {
    this._placeholder = value;
    this.stateChanges.next();
  }
  private _placeholder: string;

  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
    this.stateChanges.next();
  }
  private _required = false;

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
    this._disabled ? this.number.disable() : this.number.enable();
    this.stateChanges.next();
  }
  private _disabled = false;

  @Input()
  get value(): number | null {
    if (this.number.valid) {
      const { value: area } = this.number;

      // try parse float depending on locale

      return convertNumber(this.number.value, this.locale);
    }
    return 0;
  }
  set value(tel: number | null) {
    this.number.setValue(tel ? tel.toLocaleString(this.locale) : '');
    this.stateChanges.next();
  }

  get errorState(): boolean {
    return this.number.invalid && this.touched;
  }

  constructor(
    @Inject(LOCALE_ID) public locale: string,
    private _formBuilder: FormBuilder,
    private _focusMonitor: FocusMonitor,
    private _elementRef: ElementRef<HTMLElement>,
    @Optional() @Inject(MAT_FORM_FIELD) public _formField: MatFormField,
    @Optional() @Self() public ngControl: NgControl
  ) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this._focusMonitor.stopMonitoring(this._elementRef);
  }

  onFocusIn(event: FocusEvent) {
    if (!this.focused) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onFocusOut(event: FocusEvent) {
    if (
      !this._elementRef.nativeElement.contains(event.relatedTarget as Element)
    ) {
      this.touched = true;
      this.focused = false;
      this.onTouched();
      this.stateChanges.next();
    }
  }

  autoFocusNext(
    control: AbstractControl,
    nextElement?: HTMLInputElement
  ): void {
    if (!control.errors && nextElement) {
      this._focusMonitor.focusVia(nextElement, 'program');
    }
  }

  autoFocusPrev(control: AbstractControl, prevElement: HTMLInputElement): void {
    if (control.value.length < 1) {
      this._focusMonitor.focusVia(prevElement, 'program');
    }
  }

  setDescribedByIds(ids: string[]) {
    const controlElement = this._elementRef.nativeElement.querySelector(
      '.example-tel-input-container'
    )!;
    controlElement.setAttribute('aria-describedby', ids.join(' '));
  }

  onContainerClick() {}

  writeValue(tel: number): void {
    this.value = tel;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  _handleInput(control: AbstractControl, nextElement?: HTMLInputElement): void {
    this.autoFocusNext(control, nextElement);
    this.onChange(this.value);
  }
}

/**  Copyright 2022 Google LLC. All Rights Reserved.
    Use of this source code is governed by an MIT-style license that
    can be found in the LICENSE file at https://angular.io/license */

// this maybe should be in a different functions file that is imported
export function convertNumber(
  num: string | null,
  locale: string
): number | null {
  const { format } = new Intl.NumberFormat(locale);
  const decimalSigns = /^0(.)1$/.exec(format(0.1));
  // TODO return NULL when it's not a valid number at all
  // right now does not error when using english style input 123.456 even when in french local

  const decimalSign = decimalSigns?.length == 2 ? decimalSigns[1] : '';
  if (decimalSign == '') return null;
  const strnum = num
    ? num
        .replace(new RegExp(`[^${decimalSign}\\d]`, 'g'), '')
        .replace(decimalSign, '.')
    : '';
  return parseFloat(strnum);
}

export function localizedNumberValidator(locale: string): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const forbidden = convertNumber(control.value, locale);
    return forbidden ? { invalidamount: { value: control.value } } : null;
  };
}
