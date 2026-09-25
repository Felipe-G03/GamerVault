using System;
using System.Runtime.InteropServices;
using System.Text;

class Program {
    [DllImport("user32.dll", SetLastError = true)]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    static void Main(string[] args) {
        if (args == null || args.Length == 0) return;

        // Se passar --list, lista as janelas visíveis
        if (args[0] == "--list") {
            EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
                if (!IsWindowVisible(hWnd)) return true;
                StringBuilder sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, sb.Capacity);
                string title = sb.ToString();
                if (!string.IsNullOrEmpty(title.Trim())) {
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);
                    Console.WriteLine(hWnd.ToInt64() + "|" + pid + "|" + title);
                }
                return true;
            }, IntPtr.Zero);
            return;
        }

        // 1. Tenta resolver por HWND direto
        long hwndVal;
        if (long.TryParse(args[0], out hwndVal) && hwndVal > 0) {
            IntPtr hwnd = new IntPtr(hwndVal);
            uint pid;
            GetWindowThreadProcessId(hwnd, out pid);
            if (pid > 0) {
                Console.WriteLine(pid);
                return;
            }
        }

        // 2. Fallback: Busca por título
        string search = string.Join(" ", args).Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(search)) return;

        uint foundPid = 0;
        EnumWindows(delegate(IntPtr hwnd, IntPtr lParam) {
            StringBuilder sb = new StringBuilder(512);
            GetWindowText(hwnd, sb, sb.Capacity);
            string title = sb.ToString();
            if (!string.IsNullOrEmpty(title) && title.ToLowerInvariant().Contains(search)) {
                uint p;
                GetWindowThreadProcessId(hwnd, out p);
                if (p > 0) {
                    foundPid = p;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);

        if (foundPid > 0) {
            Console.WriteLine(foundPid);
        }
    }
}
