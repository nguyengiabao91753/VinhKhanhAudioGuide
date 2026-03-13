import styles from './LoadingSpinner.module.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  label?: string;
}

export function LoadingSpinner({ size = 'medium', label }: LoadingSpinnerProps) {
  return (
    <div className={styles.container}>
      <div className={`${styles.spinner} ${styles[`spinner_${size}`]}`} />
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
}
