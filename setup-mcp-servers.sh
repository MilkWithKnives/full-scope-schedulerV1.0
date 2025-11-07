#!/bin/bash

# SvelteRoster MCP Servers Setup Script
# This script installs both OR-Tools and Universal Solver MCP servers

echo "🚀 Setting up MCP servers for SvelteRoster..."

# Install OR-Tools MCP Server
echo "📦 Installing OR-Tools MCP Server..."
pip install git+https://github.com/Jacck/mcp-ortools.git

# Verify OR-Tools installation
echo "✅ Testing OR-Tools installation..."
python -c "import mcp_ortools.server; print('OR-Tools MCP server installed successfully')"

# Check if Docker is available for Universal Solver
if command -v docker &> /dev/null; then
    echo "🐳 Docker found - Universal Solver will use Docker"
    docker pull ghcr.io/sdiehl/usolver:latest
else
    echo "⚠️  Docker not found - Universal Solver will need manual installation"
    echo "   You can install Docker later or use the OR-Tools server only"
fi

# Create Claude Desktop configuration directory if it doesn't exist
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    CONFIG_DIR="$APPDATA/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
else
    # Linux
    CONFIG_DIR="$HOME/.config/Claude"
    CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
fi

mkdir -p "$CONFIG_DIR"

# Create or update Claude Desktop configuration
echo "⚙️  Configuring Claude Desktop..."

# Check if config file exists
if [ -f "$CONFIG_FILE" ]; then
    echo "📝 Updating existing Claude Desktop configuration..."
    # Backup existing config
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "   Backup created: $CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
else
    echo "📝 Creating new Claude Desktop configuration..."
fi

# Create the configuration
cat > "$CONFIG_FILE" << 'EOF'
{
  "mcpServers": {
    "ortools": {
      "command": "python",
      "args": ["-m", "mcp_ortools.server"]
    },
    "usolver": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "-p",
        "8081:8081",
        "--rm",
        "ghcr.io/sdiehl/usolver:latest"
      ]
    }
  }
}
EOF

echo "✅ Claude Desktop configuration updated!"
echo "📍 Configuration file: $CONFIG_FILE"

# Create test script
cat > test-mcp-servers.py << 'EOF'
#!/usr/bin/env python3
"""
Test script for MCP servers
"""

def test_ortools():
    """Test OR-Tools MCP server"""
    try:
        import mcp_ortools.server
        print("✅ OR-Tools MCP server: Ready")
        return True
    except ImportError as e:
        print(f"❌ OR-Tools MCP server: Failed - {e}")
        return False

def test_docker():
    """Test Docker availability for Universal Solver"""
    import subprocess
    try:
        result = subprocess.run(['docker', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Docker: Available")
            return True
        else:
            print("❌ Docker: Not working properly")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("❌ Docker: Not installed")
        return False

def main():
    print("🧪 Testing MCP servers...")
    print("-" * 40)
    
    ortools_ok = test_ortools()
    docker_ok = test_docker()
    
    print("-" * 40)
    if ortools_ok and docker_ok:
        print("🎉 All MCP servers ready!")
    elif ortools_ok:
        print("⚠️  OR-Tools ready, Docker needs setup")
    else:
        print("❌ Setup incomplete - check errors above")

if __name__ == "__main__":
    main()
EOF

chmod +x test-mcp-servers.py

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run the test script: python test-mcp-servers.py"
echo "2. Restart Claude Desktop to load the new configuration"
echo "3. Test the servers in Claude Desktop"
echo ""
echo "Configuration details:"
echo "- OR-Tools MCP server: Installed via pip"
echo "- Universal Solver: Uses Docker (port 8081)"
echo "- Claude config: $CONFIG_FILE"
echo ""
echo "If you encounter issues:"
echo "- Check the backup config file if needed"
echo "- Ensure Python and pip are working"
echo "- For Universal Solver, ensure Docker is running"
