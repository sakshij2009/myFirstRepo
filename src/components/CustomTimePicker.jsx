import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import dayjs from 'dayjs';

const customTheme = createTheme({
    palette: {
        primary: {
            main: '#1D5F33', // dark-green
        },
        error: {
            main: '#ef4444', // red-500
        }
    },
    components: {
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    padding: 0,
                    borderRadius: 0,
                    backgroundColor: 'transparent',
                    '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                    },
                },
                input: {
                    padding: '10px', // exact padding to match p-[10px]
                    fontSize: '0.875rem', // text-sm
                    color: '#111827', // text-gray-900
                    height: '1.25rem', // EXACTLY 20px (same as leading-5 / text-sm)
                    lineHeight: '1.25rem',
                    fontFamily: 'inherit',
                    boxSizing: 'content-box',
                    '&::placeholder': {
                        color: '#9ca3af',
                        opacity: 1,
                    },
                },
            },
        },
    },
});

export const CustomTimePicker = ({ value, onChange, placeholder = "hh:mm aa", className, error }) => {
    const isError = error || (className && className.includes('border-red-500'));

    // Use tailwind classes to match our standard TextInputs exactly
    let wrapperClass = className || "block w-full rounded border border-light-gray";

    // Clean up any padding classes from wrapper so the inner input handles all padding precisely 
    // without doubling the padding and inflating the input height.
    wrapperClass = wrapperClass.replace(/p-\[\d+[a-z]*\]/g, '')
        .replace(/px-\[\d+[a-z]*\]/g, '')
        .replace(/py-\[\d+[a-z]*\]/g, '')
        .replace(/p-\d+/g, '')
        .replace(/px-\d+/g, '')
        .replace(/py-\d+/g, '')
        .replace(/border-red-500/g, '')
        .replace(/border-light-gray/g, '');

    wrapperClass = wrapperClass.replace(/bg-white/g, '');

    wrapperClass += ` bg-white overflow-hidden border ${isError ? 'border-red-500' : 'border-[#E6E6E6]'} focus-within:!border-black h-[42px] flex items-center`;

    // Fix multiple spaces
    wrapperClass = wrapperClass.replace(/\s+/g, ' ').trim();

    return (
        <ThemeProvider theme={customTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div className={wrapperClass}>
                    <MobileTimePicker
                        value={value ? dayjs(value, "HH:mm") : null}
                        onChange={(newVal) => {
                            onChange(newVal ? newVal.format("HH:mm") : "");
                        }}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                variant: 'outlined',
                                placeholder: placeholder,
                            }
                        }}
                    />
                </div>
            </LocalizationProvider>
        </ThemeProvider>
    );
};
