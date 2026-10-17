using System;
using System.Collections.Generic;
using System.IO;
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

    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll", ExactSpelling = true)]
    static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);

    const uint GA_ROOT = 2;

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    const uint SWP_NOSIZE = 0x0001;
    const uint SWP_NOMOVE = 0x0002;
    const uint SWP_NOZORDER = 0x0004;
    const uint SWP_NOACTIVATE = 0x0010;
    const uint SWP_FRAMECHANGED = 0x0020;

    [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
    static extern int GetWindowLong32(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "SetWindowLong")]
    static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
    static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr")]
    static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

    static IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex) {
        if (IntPtr.Size == 8) return GetWindowLongPtr64(hWnd, nIndex);
        return new IntPtr(GetWindowLong32(hWnd, nIndex));
    }

    static IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong) {
        if (IntPtr.Size == 8) return SetWindowLongPtr64(hWnd, nIndex, dwNewLong);
        return new IntPtr(SetWindowLong32(hWnd, nIndex, dwNewLong.ToInt32()));
    }

    const int GWL_EXSTYLE = -20;
    const int WS_EX_NOACTIVATE = 0x08000000;
    const int WS_EX_TOPMOST = 0x00000008;

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, uint processId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    static extern bool QueryFullProcessImageName(IntPtr hProcess, int flags, StringBuilder text, ref int size);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CloseHandle(IntPtr hObject);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct PROCESSENTRY32 {
        public uint dwSize;
        public uint cntUsage;
        public uint th32ProcessID;
        public IntPtr th32DefaultHeapID;
        public uint th32ModuleID;
        public uint cntThreads;
        public uint th32ParentProcessID;
        public int pcPriClassBase;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string szExeFile;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr CreateToolhelp32Snapshot(uint dwFlags, uint th32ProcessID);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern bool Process32First(IntPtr hSnapshot, ref PROCESSENTRY32 lppe);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern bool Process32Next(IntPtr hSnapshot, ref PROCESSENTRY32 lppe);

    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
    const uint TH32CS_SNAPPROCESS = 0x00000002;

    static readonly string[] BlacklistExes = new string[] {
        "explorer", "gamervault", "electron", "cmd", "conhost", "powershell",
        "taskhostw", "svchost", "searchapp", "startmenuexperiencehost", "shellexperiencehost",
        "textinputhost", "system", "idle", "csrss", "wininit", "winlogon", "services", "lsass",
        "crashhandler", "crashreporter", "werfault", "errorreport",
        "unins000.exe", "uninstall.exe", "dxwebsetup.exe", "vcredist.exe", "easyanticheat.exe",
        "battleye.exe", "epicgameslauncher.exe", "steamservice.exe", "steamwebhelper.exe"
    };

    static bool IsBlacklisted(string exeName) {
        if (string.IsNullOrEmpty(exeName)) return true;
        string lower = exeName.ToLowerInvariant();
        foreach (var b in BlacklistExes) {
            if (lower == b || lower.Contains(b)) return true;
        }
        return false;
    }

    static string GetProcessPath(uint pid) {
        if (pid <= 4) return string.Empty;
        IntPtr hProc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
        if (hProc == IntPtr.Zero) return string.Empty;
        try {
            StringBuilder sb = new StringBuilder(1024);
            int size = sb.Capacity;
            if (QueryFullProcessImageName(hProc, 0, sb, ref size)) {
                return sb.ToString();
            }
        } finally {
            CloseHandle(hProc);
        }
        return string.Empty;
    }

    static List<PROCESSENTRY32> GetAllProcesses() {
        List<PROCESSENTRY32> list = new List<PROCESSENTRY32>();
        IntPtr snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (snap == IntPtr.Zero || snap == new IntPtr(-1)) return list;
        try {
            PROCESSENTRY32 entry = new PROCESSENTRY32();
            entry.dwSize = (uint)Marshal.SizeOf(typeof(PROCESSENTRY32));
            if (Process32First(snap, ref entry)) {
                do {
                    list.Add(entry);
                } while (Process32Next(snap, ref entry));
            }
        } finally {
            CloseHandle(snap);
        }
        return list;
    }

    static IntPtr FindMainWindowForPid(uint targetPid) {
        if (targetPid <= 4) return IntPtr.Zero;
        IntPtr found = IntPtr.Zero;
        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == targetPid) {
                StringBuilder sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, sb.Capacity);
                if (!string.IsNullOrEmpty(sb.ToString().Trim())) {
                    found = hWnd;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }

    static void Main(string[] args) {
        if (args == null || args.Length == 0) return;

        string mode = args[0];

        // 1. Obter janela em primeiro plano (Foreground)
        if (mode == "--foreground") {
            IntPtr fg = GetForegroundWindow();
            if (fg != IntPtr.Zero) {
                uint pid;
                GetWindowThreadProcessId(fg, out pid);
                StringBuilder sb = new StringBuilder(512);
                GetWindowText(fg, sb, sb.Capacity);
                string title = sb.ToString();
                string path = GetProcessPath(pid);
                string procName = !string.IsNullOrEmpty(path) ? Path.GetFileName(path) : "";
                Console.WriteLine(fg.ToInt64() + "|" + pid + "|" + procName + "|" + title);
            }
            return;
        }

        // 2. Definir estilo WS_EX_NOACTIVATE na janela
        if (mode == "--set-noactivate" && args.Length >= 2) {
            long hwndToStyle;
            if (long.TryParse(args[1], out hwndToStyle) && hwndToStyle > 0) {
                try {
                    IntPtr hwnd = new IntPtr(hwndToStyle);
                    long exStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE).ToInt64();
                    exStyle |= (long)WS_EX_NOACTIVATE | (long)WS_EX_TOPMOST;
                    SetWindowLongPtr(hwnd, GWL_EXSTYLE, new IntPtr(exStyle));
                    SetWindowPos(hwnd, IntPtr.Zero, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
                    Console.WriteLine("OK");
                } catch (Exception ex) {
                    Console.WriteLine("ERR:" + ex.Message);
                }
                return;
            }
        }

        // 3. Restaurar foco na janela do jogo (evita que o jogo fique em segundo plano)
        if (mode == "--focus-game" && args.Length >= 2) {
            long targetHwnd = 0;
            long.TryParse(args[1], out targetHwnd);
            uint targetPid = 0;
            if (args.Length >= 3) uint.TryParse(args[2], out targetPid);

            IntPtr hwndToFocus = IntPtr.Zero;
            if (targetHwnd > 0) hwndToFocus = new IntPtr(targetHwnd);
            else if (targetPid > 0) hwndToFocus = FindMainWindowForPid(targetPid);

            if (hwndToFocus != IntPtr.Zero) {
                SetForegroundWindow(hwndToFocus);
                Console.WriteLine("OK");
            } else {
                Console.WriteLine("0");
            }
            return;
        }

        // 4. Verificar se o jogo está em foco (ou se o overlay está em foco/sendo interagido)
        if (mode == "--is-game-focused" && args.Length >= 2) {
            uint targetPid = 0;
            uint.TryParse(args[1], out targetPid);
            long targetHwnd = 0;
            if (args.Length >= 3) long.TryParse(args[2], out targetHwnd);
            long overlayHwnd = 0;
            if (args.Length >= 4) long.TryParse(args[3], out overlayHwnd);
            uint electronPid = 0;
            if (args.Length >= 5) uint.TryParse(args[4], out electronPid);

            IntPtr fg = GetForegroundWindow();
            if (fg != IntPtr.Zero) {
                IntPtr rootFg = GetAncestor(fg, GA_ROOT);
                if (rootFg == IntPtr.Zero) rootFg = fg;

                long fgHwndVal = fg.ToInt64();
                long rootHwndVal = rootFg.ToInt64();

                // Foco está no jogo?
                if (targetHwnd > 0 && (fgHwndVal == targetHwnd || rootHwndVal == targetHwnd)) {
                    Console.WriteLine("1");
                    return;
                }

                // Foco está no Overlay ou em qualquer elemento/janela filha dele?
                if (overlayHwnd > 0 && (fgHwndVal == overlayHwnd || rootHwndVal == overlayHwnd)) {
                    Console.WriteLine("1");
                    return;
                }

                uint fgPid;
                GetWindowThreadProcessId(fg, out fgPid);
                if (targetPid > 0 && fgPid == targetPid) {
                    Console.WriteLine("1");
                    return;
                }
                if (electronPid > 0 && fgPid == electronPid) {
                    Console.WriteLine("1");
                    return;
                }

                // Se o processo em foco for qualquer processo do GamerVault / Electron (Main, GPU ou Renderer)
                string fgPath = GetProcessPath(fgPid);
                if (!string.IsNullOrEmpty(fgPath)) {
                    string lowerExe = Path.GetFileName(fgPath).ToLowerInvariant();
                    if (lowerExe.Contains("gamervault") || lowerExe == "electron.exe") {
                        Console.WriteLine("1");
                        return;
                    }
                }
            }
            Console.WriteLine("0");
            return;
        }

        // 5. Localizar processo real do jogo (lida com launchers, executáveis filhos e títulos)
        if (mode == "--find-game" && args.Length >= 2) {
            string gameTitle = args[1].Trim().ToLowerInvariant();
            string gameDir = args.Length >= 3 ? args[2].Trim() : string.Empty;
            uint parentPid = 0;
            if (args.Length >= 4) uint.TryParse(args[3], out parentPid);

            var procs = GetAllProcesses();

            // Etapa A: Processo filho do Launcher (ParentProcessID)
            if (parentPid > 0) {
                foreach (var p in procs) {
                    if (p.th32ParentProcessID == parentPid && p.th32ProcessID > 0) {
                        if (!IsBlacklisted(p.szExeFile)) {
                            string pPath = GetProcessPath(p.th32ProcessID);
                            IntPtr mainHwnd = FindMainWindowForPid(p.th32ProcessID);
                            Console.WriteLine(p.th32ProcessID + "|" + mainHwnd.ToInt64() + "|" + p.szExeFile + "|" + pPath);
                            return;
                        }
                    }
                }
            }

            // Etapa B: Processo executando a partir do diretório do jogo
            if (!string.IsNullOrEmpty(gameDir) && Directory.Exists(gameDir)) {
                string normDir = gameDir.TrimEnd('\\', '/').ToLowerInvariant();
                foreach (var p in procs) {
                    if (p.th32ProcessID <= 4 || IsBlacklisted(p.szExeFile)) continue;
                    string fullPath = GetProcessPath(p.th32ProcessID);
                    if (!string.IsNullOrEmpty(fullPath)) {
                        string lowerPath = fullPath.ToLowerInvariant();
                        if (lowerPath.StartsWith(normDir)) {
                            IntPtr mainHwnd = FindMainWindowForPid(p.th32ProcessID);
                            Console.WriteLine(p.th32ProcessID + "|" + mainHwnd.ToInt64() + "|" + p.szExeFile + "|" + fullPath);
                            return;
                        }
                    }
                }
            }

            // Etapa C: Processo cujo nome do executável bate com o título do jogo
            if (!string.IsNullOrEmpty(gameTitle)) {
                string cleanSearch = gameTitle
                    .Replace("™", "").Replace("®", "").Replace(":", "").Replace("-", " ")
                    .Replace("'", "").Replace("  ", " ").Trim();
                string[] keywords = cleanSearch.Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                string compactTitle = cleanSearch.Replace(" ", "");

                foreach (var p in procs) {
                    if (p.th32ProcessID <= 4 || IsBlacklisted(p.szExeFile)) continue;
                    string lowerExe = p.szExeFile.ToLowerInvariant().Replace(".exe", "");
                    if (compactTitle.Length > 3 && lowerExe.Contains(compactTitle)) {
                        string pPath = GetProcessPath(p.th32ProcessID);
                        IntPtr mainHwnd = FindMainWindowForPid(p.th32ProcessID);
                        Console.WriteLine(p.th32ProcessID + "|" + mainHwnd.ToInt64() + "|" + p.szExeFile + "|" + pPath);
                        return;
                    }
                }

                // Etapa D: Janela visível pelo título da janela
                uint matchedPid = 0;
                long matchedHwnd = 0;
                string matchedTitle = "";
                string matchedExe = "";

                EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
                    if (!IsWindowVisible(hWnd)) return true;
                    StringBuilder sb = new StringBuilder(512);
                    GetWindowText(hWnd, sb, sb.Capacity);
                    string title = sb.ToString();
                    if (string.IsNullOrEmpty(title.Trim())) return true;

                    string lowerTitle = title.ToLowerInvariant();
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);
                    if (pid <= 4) return true;

                    string path = GetProcessPath(pid);
                    string exeName = !string.IsNullOrEmpty(path) ? Path.GetFileName(path) : "";
                    if (IsBlacklisted(exeName)) return true;

                    int matchCount = 0;
                    foreach (var kw in keywords) {
                        if (kw.Length > 2 && lowerTitle.Contains(kw)) matchCount++;
                    }

                    int neededMatches = keywords.Length <= 1 ? 1 : Math.Min(2, keywords.Length);
                    if (matchCount >= neededMatches || (compactTitle.Length > 4 && lowerTitle.Replace(" ", "").Contains(compactTitle))) {
                        matchedPid = pid;
                        matchedHwnd = hWnd.ToInt64();
                        matchedTitle = title;
                        matchedExe = exeName;
                        return false; // Interrompe enumeração
                    }
                    return true;
                }, IntPtr.Zero);

                if (matchedPid > 0) {
                    Console.WriteLine(matchedPid + "|" + matchedHwnd + "|" + matchedExe + "|" + matchedTitle);
                    return;
                }
            }

            return;
        }

        // 6. Se passar --list, lista as janelas visíveis (compatibilidade)
        if (mode == "--list") {
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

        // 7. Tenta resolver por HWND direto (compatibilidade)
        long hwndVal;
        if (long.TryParse(mode, out hwndVal) && hwndVal > 0) {
            IntPtr hwnd = new IntPtr(hwndVal);
            uint pid;
            GetWindowThreadProcessId(hwnd, out pid);
            if (pid > 0) {
                Console.WriteLine(pid);
                return;
            }
        }

        // 8. Fallback legado: Busca por título
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
