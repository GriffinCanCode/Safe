/**
 * @fileoverview Component Type Definitions
 * @responsibility Types for Vue components and their props/emits
 */

import type { Component } from 'vue';

/**
 * Base component props
 */
export interface BaseComponentProps {
  id?: string;
  class?: string | string[] | Record<string, boolean>;
  style?: string | Record<string, string>;
  disabled?: boolean;
  loading?: boolean;
  testId?: string;
}

/**
 * Button component props
 */
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'light' | 'dark' | 'link' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  type?: 'button' | 'submit' | 'reset';
  block?: boolean;
  rounded?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  href?: string;
  target?: string;
  download?: string;
}

/**
 * Input component props
 */
export interface InputProps extends BaseComponentProps {
  modelValue?: string | number;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local';
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  autofocus?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  pattern?: string;
  maxlength?: number;
  minlength?: number;
  size?: 'sm' | 'md' | 'lg';
  clearable?: boolean;
  showPassword?: boolean;
  prefix?: string;
  suffix?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
}

/**
 * Modal component props
 */
export interface ModalProps extends BaseComponentProps {
  modelValue?: boolean;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  persistent?: boolean;
  backdrop?: boolean;
  keyboard?: boolean;
  centered?: boolean;
  scrollable?: boolean;
  fullscreen?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  zIndex?: number;
  transition?: string;
}

/**
 * Card component props
 */
export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  imagePosition?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  clickable?: boolean;
  hoverable?: boolean;
}

/**
 * Table component props
 */
export interface TableProps extends BaseComponentProps {
  data?: any[];
  columns?: TableColumn[];
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  pagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  loading?: boolean;
  empty?: string;
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;
  dense?: boolean;
}

/**
 * Table column definition
 */
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: any) => string;
  render?: (value: any, row: any) => Component | string;
  headerClass?: string;
  cellClass?: string;
  hidden?: boolean;
}

/**
 * Form component props
 */
export interface FormProps extends BaseComponentProps {
  modelValue?: Record<string, any>;
  schema?: FormSchema;
  validation?: FormValidation;
  readonly?: boolean;
  inline?: boolean;
  labelPosition?: 'top' | 'left' | 'right';
  labelWidth?: string;
  showErrors?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * Form schema
 */
export interface FormSchema {
  fields: FormField[];
  groups?: FormGroup[];
  layout?: 'vertical' | 'horizontal' | 'inline';
}

/**
 * Form field definition
 */
export interface FormField {
  name: string;
  type: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'file';
  label?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  props?: Record<string, any>;
  class?: string;
  style?: string;
  group?: string;
  order?: number;
}

/**
 * Form field option
 */
export interface FormFieldOption {
  label: string;
  value: any;
  disabled?: boolean;
  group?: string;
}

/**
 * Form field validation
 */
export interface FormFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
  email?: boolean;
  url?: boolean;
  custom?: (value: any) => boolean | string;
}

/**
 * Form validation
 */
export interface FormValidation {
  rules?: Record<string, FormFieldValidation>;
  messages?: Record<string, string>;
  validateOnSubmit?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * Form group
 */
export interface FormGroup {
  name: string;
  label?: string;
  description?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: string[];
}

/**
 * Dropdown component props
 */
export interface DropdownProps extends BaseComponentProps {
  modelValue?: any;
  options?: DropdownOption[];
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  closeOnSelect?: boolean;
  maxHeight?: string;
  optionLabel?: string;
  optionValue?: string;
  optionDisabled?: string;
  groupBy?: string;
  loading?: boolean;
  loadingText?: string;
  noOptionsText?: string;
  searchPlaceholder?: string;
}

/**
 * Dropdown option
 */
export interface DropdownOption {
  label: string;
  value: any;
  disabled?: boolean;
  group?: string;
  icon?: string;
  description?: string;
}

/**
 * Tabs component props
 */
export interface TabsProps extends BaseComponentProps {
  modelValue?: string | number;
  tabs?: Tab[];
  variant?: 'default' | 'pills' | 'underline' | 'card';
  position?: 'top' | 'bottom' | 'left' | 'right';
  vertical?: boolean;
  closable?: boolean;
  addable?: boolean;
  scrollable?: boolean;
}

/**
 * Tab definition
 */
export interface Tab {
  key: string | number;
  label: string;
  icon?: string;
  disabled?: boolean;
  closable?: boolean;
  badge?: string | number;
  content?: Component | string;
}

/**
 * Pagination component props
 */
export interface PaginationProps extends BaseComponentProps {
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  pageSizes?: number[];
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  simple?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Loading spinner props
 */
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  overlay?: boolean;
  text?: string;
  inline?: boolean;
}

/**
 * Progress bar props
 */
export interface ProgressBarProps extends BaseComponentProps {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  striped?: boolean;
  animated?: boolean;
  showValue?: boolean;
  height?: string;
  label?: string;
}

/**
 * Alert component props
 */
export interface AlertProps extends BaseComponentProps {
  type?: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message?: string;
  dismissible?: boolean;
  icon?: string;
  actions?: AlertAction[];
  variant?: 'filled' | 'outlined' | 'soft';
}

/**
 * Alert action
 */
export interface AlertAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

/**
 * Tooltip props
 */
export interface TooltipProps extends BaseComponentProps {
  content?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
  trigger?: 'hover' | 'click' | 'focus' | 'manual';
  delay?: number;
  hideDelay?: number;
  arrow?: boolean;
  offset?: number;
  zIndex?: number;
}

/**
 * Popover props
 */
export interface PopoverProps extends TooltipProps {
  title?: string;
  width?: string;
  maxWidth?: string;
  persistent?: boolean;
}

/**
 * Menu component props
 */
export interface MenuProps extends BaseComponentProps {
  items?: MenuItem[];
  mode?: 'horizontal' | 'vertical' | 'inline';
  theme?: 'light' | 'dark';
  collapsed?: boolean;
  accordion?: boolean;
  selectedKeys?: string[];
  openKeys?: string[];
}

/**
 * Menu item
 */
export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  hidden?: boolean;
  children?: MenuItem[];
  route?: string;
  href?: string;
  target?: string;
  badge?: string | number;
  divider?: boolean;
}

/**
 * Tree component props
 */
export interface TreeProps extends BaseComponentProps {
  data?: TreeNode[];
  selectable?: boolean;
  checkable?: boolean;
  draggable?: boolean;
  expandedKeys?: string[];
  selectedKeys?: string[];
  checkedKeys?: string[];
  autoExpandParent?: boolean;
  showLine?: boolean;
  showIcon?: boolean;
  virtual?: boolean;
  height?: number;
}

/**
 * Tree node
 */
export interface TreeNode {
  key: string;
  title: string;
  icon?: string;
  disabled?: boolean;
  disableCheckbox?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  children?: TreeNode[];
  isLeaf?: boolean;
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean;
  loading?: boolean;
}

/**
 * Upload component props
 */
export interface UploadProps extends BaseComponentProps {
  action?: string;
  accept?: string;
  multiple?: boolean;
  directory?: boolean;
  maxSize?: number;
  maxCount?: number;
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
  customRequest?: (options: UploadRequestOptions) => void;
  showUploadList?: boolean;
  listType?: 'text' | 'picture' | 'picture-card';
  previewFile?: (file: File) => Promise<string>;
  transformFile?: (file: File) => File | Promise<File>;
}

/**
 * Upload request options
 */
export interface UploadRequestOptions {
  file: File;
  filename: string;
  action: string;
  data?: Record<string, any>;
  headers?: Record<string, string>;
  onProgress: (event: ProgressEvent) => void;
  onSuccess: (response: any) => void;
  onError: (error: Error) => void;
}

/**
 * Component event emitters
 */
export interface ComponentEmits {
  'update:modelValue': [value: any];
  'change': [value: any];
  'input': [value: any];
  'focus': [event: FocusEvent];
  'blur': [event: FocusEvent];
  'click': [event: MouseEvent];
  'submit': [data: any];
  'reset': [];
  'cancel': [];
  'confirm': [];
  'close': [];
  'open': [];
  'select': [value: any];
  'deselect': [value: any];
  'expand': [keys: string[]];
  'collapse': [keys: string[]];
  'check': [keys: string[]];
  'uncheck': [keys: string[]];
  'upload': [files: File[]];
  'remove': [file: File];
  'preview': [file: File];
  'download': [file: File];
  'error': [error: Error];
  'success': [data: any];
  'progress': [progress: number];
  'complete': [];
}

/**
 * Component slots
 */
export interface ComponentSlots {
  default?: () => any;
  header?: () => any;
  footer?: () => any;
  title?: () => any;
  content?: () => any;
  actions?: () => any;
  prefix?: () => any;
  suffix?: () => any;
  prepend?: () => any;
  append?: () => any;
  icon?: () => any;
  loading?: () => any;
  empty?: () => any;
  error?: () => any;
  [key: string]: (() => any) | undefined;
} 