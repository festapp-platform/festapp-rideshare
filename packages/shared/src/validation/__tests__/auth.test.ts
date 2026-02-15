import { describe, it, expect } from 'vitest';
import {
  PhoneSchema,
  EmailSchema,
  OtpSchema,
  PasswordSchema,
  DisplayNameSchema,
  SignUpSchema,
  LoginSchema,
} from '../auth';

// TODO: Add e2e auth tests with Supabase local (signInWithOtp, verifyOtp, signInWithPassword)
// when CI pipeline with Supabase CLI is set up.

describe('PhoneSchema', () => {
  it('accepts valid international phone numbers', () => {
    expect(PhoneSchema.parse('+420123456789')).toBe('+420123456789');
    expect(PhoneSchema.parse('+1234567890')).toBe('+1234567890');
    expect(PhoneSchema.parse('+44771234567')).toBe('+44771234567');
  });

  it('rejects phone without + prefix', () => {
    expect(() => PhoneSchema.parse('420123456789')).toThrow();
  });

  it('rejects phone with leading zero after +', () => {
    expect(() => PhoneSchema.parse('+0123456789')).toThrow();
  });

  it('rejects too short phone numbers', () => {
    expect(() => PhoneSchema.parse('+12345')).toThrow();
  });

  it('rejects phone with letters', () => {
    expect(() => PhoneSchema.parse('+420abc456789')).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => PhoneSchema.parse('')).toThrow();
  });
});

describe('EmailSchema', () => {
  it('accepts valid emails', () => {
    expect(EmailSchema.parse('user@example.com')).toBe('user@example.com');
    expect(EmailSchema.parse('test.user@domain.co.uk')).toBe('test.user@domain.co.uk');
  });

  it('rejects invalid emails', () => {
    expect(() => EmailSchema.parse('not-an-email')).toThrow();
    expect(() => EmailSchema.parse('@missing-local.com')).toThrow();
    expect(() => EmailSchema.parse('missing-domain@')).toThrow();
    expect(() => EmailSchema.parse('')).toThrow();
  });
});

describe('OtpSchema', () => {
  it('accepts valid 6-digit OTP', () => {
    expect(OtpSchema.parse('123456')).toBe('123456');
    expect(OtpSchema.parse('000000')).toBe('000000');
  });

  it('rejects OTP with wrong length', () => {
    expect(() => OtpSchema.parse('12345')).toThrow('6 digits');
    expect(() => OtpSchema.parse('1234567')).toThrow('6 digits');
  });

  it('rejects non-numeric OTP', () => {
    expect(() => OtpSchema.parse('12345a')).toThrow('numeric');
    expect(() => OtpSchema.parse('abcdef')).toThrow('numeric');
  });

  it('rejects empty string', () => {
    expect(() => OtpSchema.parse('')).toThrow();
  });
});

describe('PasswordSchema', () => {
  it('accepts passwords with 8+ characters', () => {
    expect(PasswordSchema.parse('12345678')).toBe('12345678');
    expect(PasswordSchema.parse('a-very-long-secure-password!')).toBe(
      'a-very-long-secure-password!',
    );
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(() => PasswordSchema.parse('1234567')).toThrow('8 characters');
    expect(() => PasswordSchema.parse('')).toThrow('8 characters');
  });
});

describe('DisplayNameSchema', () => {
  it('accepts valid display names', () => {
    expect(DisplayNameSchema.parse('John')).toBe('John');
    expect(DisplayNameSchema.parse('A')).toBe('A'); // min 1 char
  });

  it('rejects empty display name', () => {
    expect(() => DisplayNameSchema.parse('')).toThrow();
  });

  it('rejects display names over 50 characters', () => {
    expect(() => DisplayNameSchema.parse('a'.repeat(51))).toThrow();
  });

  it('accepts display name at max length', () => {
    const name = 'a'.repeat(50);
    expect(DisplayNameSchema.parse(name)).toBe(name);
  });
});

describe('SignUpSchema', () => {
  const validData = {
    display_name: 'John Doe',
    email: 'john@example.com',
    password: 'securepass123',
  };

  it('accepts valid signup data', () => {
    const result = SignUpSchema.parse(validData);
    expect(result).toEqual(validData);
  });

  it('rejects missing display_name', () => {
    const { display_name: _, ...rest } = validData;
    expect(() => SignUpSchema.parse(rest)).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => SignUpSchema.parse({ ...validData, email: 'bad' })).toThrow();
  });

  it('rejects short password', () => {
    expect(() => SignUpSchema.parse({ ...validData, password: '123' })).toThrow();
  });

  it('rejects extra fields by stripping them', () => {
    const result = SignUpSchema.parse({ ...validData, extra: 'field' });
    expect(result).not.toHaveProperty('extra');
  });
});

describe('LoginSchema', () => {
  const validData = {
    email: 'john@example.com',
    password: 'securepass123',
  };

  it('accepts valid login data', () => {
    const result = LoginSchema.parse(validData);
    expect(result).toEqual(validData);
  });

  it('rejects missing email', () => {
    expect(() => LoginSchema.parse({ password: 'securepass123' })).toThrow();
  });

  it('rejects missing password', () => {
    expect(() => LoginSchema.parse({ email: 'john@example.com' })).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => LoginSchema.parse({ ...validData, email: 'not-email' })).toThrow();
  });

  it('rejects short password', () => {
    expect(() => LoginSchema.parse({ ...validData, password: 'short' })).toThrow();
  });
});
