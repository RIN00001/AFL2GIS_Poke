// Small Windows launcher. The game and its existing Python environment stay in place.
// Rebuild with scripts/build-launcher.ps1; no extra downloads or admin rights needed.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Web.Script.Serialization;

internal static class FieldDexLauncher
{
    private const string Url = "http://127.0.0.1:8000/";

    private static bool GameIsReady()
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create(Url + "openapi.json");
            request.Proxy = null;
            request.Timeout = 800;
            request.ReadWriteTimeout = 800;
            request.AllowAutoRedirect = false;
            using (var response = request.GetResponse())
            using (var reader = new StreamReader(response.GetResponseStream()))
            {
                var schema = new JavaScriptSerializer().DeserializeObject(reader.ReadToEnd()) as Dictionary<string, object>;
                if (schema == null || !schema.ContainsKey("info")) return false;
                var info = schema["info"] as Dictionary<string, object>;
                return info != null && info.ContainsKey("title") && (string)info["title"] == "Ciputra Field Dex";
            }
        }
        catch (WebException) { return false; }
        catch (IOException) { return false; }
        catch (ArgumentException) { return false; }
        catch (InvalidOperationException) { return false; }
    }

    private static bool PortIsBusy()
    {
        using (var client = new TcpClient())
        {
            try { client.Connect(IPAddress.Loopback, 8000); return true; }
            catch (SocketException) { return false; }
        }
    }

    private static void OpenGame(bool openBrowser)
    {
        Console.WriteLine("Game ready: " + Url);
        if (!openBrowser) return;
        try { Process.Start(new ProcessStartInfo(Url) { UseShellExecute = true }); }
        catch (Exception error)
        {
            Console.WriteLine("Open the link above in your browser. " + error.Message);
        }
    }

    private static int Error(string message, bool interactive)
    {
        Console.Error.WriteLine(message);
        if (interactive && !Console.IsInputRedirected)
        {
            Console.WriteLine("Press Enter to close.");
            Console.ReadLine();
        }
        return 1;
    }

    private static int Main(string[] args)
    {
        if (Array.IndexOf(args, "--help") >= 0)
        {
            Console.WriteLine("FieldDex.exe starts the local game and opens your browser.");
            Console.WriteLine("Keep it beside the backend, frontend and .venv folders.");
            Console.WriteLine("Press Ctrl+C to stop. --no-browser skips opening a browser.");
            return 0;
        }
        bool openBrowser = Array.IndexOf(args, "--no-browser") < 0;
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string python = Path.Combine(root, ".venv", "Scripts", "python.exe");
        if (!File.Exists(python) || !File.Exists(Path.Combine(root, "backend", "app", "main.py")))
            return Error("Keep FieldDex.exe in the AFL2GIS project folder with its .venv and backend folders. It is a launcher, not a standalone game installer.", openBrowser);

        Console.Title = "Field Dex - local game";
        if (GameIsReady())
        {
            Console.WriteLine("Field Dex is already running; using the existing game.");
            OpenGame(openBrowser);
            return 0;
        }
        if (PortIsBusy())
            return Error("Port 8000 is in use. If Field Dex is still starting, wait a moment and try again. Otherwise, stop the other server in its terminal first.", openBrowser);

        Console.WriteLine("Starting Field Dex... Keep this window open while playing.");
        Console.WriteLine("Press Ctrl+C in this window to stop the game.");
        // Python inherits this console and receives Ctrl+C for graceful shutdown.
        Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs e) { e.Cancel = true; };
        try
        {
            using (var server = Process.Start(new ProcessStartInfo(python,
                "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000")
                { WorkingDirectory = root, UseShellExecute = false }))
            {
                var timer = Stopwatch.StartNew();
                bool ready = false;
                while (!server.HasExited && timer.Elapsed.TotalSeconds < 60)
                {
                    if (GameIsReady()) { ready = true; break; }
                    Thread.Sleep(250);
                }
                if (ready) OpenGame(openBrowser);
                else if (!server.HasExited)
                    Console.WriteLine("Startup is taking longer than expected. Check the messages above, then open " + Url);
                server.WaitForExit();
                return server.ExitCode == 0 || server.ExitCode == -1073741510 ? 0 : Error("The game stopped. See the error above for details.", openBrowser);
            }
        }
        catch (Exception error) { return Error("Could not start Field Dex: " + error.Message, openBrowser); }
    }
}
