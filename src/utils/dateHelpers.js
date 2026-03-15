export const startOfMonth  = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth    = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
export const startOfLastMonth = (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
export const endOfLastMonth   = (d) => new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59);
