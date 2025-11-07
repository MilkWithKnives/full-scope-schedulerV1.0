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
