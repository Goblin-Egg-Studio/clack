import { MCPProvider } from './mcpProvider.js';

export interface ProviderRegistry {
  registerProvider(name: string, provider: MCPProvider): void;
  getProvider(name: string): MCPProvider | undefined;
  getAllProviders(): Map<string, MCPProvider>;
  hasProvider(name: string): boolean;
  removeProvider(name: string): boolean;
}

export class MCPProviderRegistry implements ProviderRegistry {
  private providers: Map<string, MCPProvider> = new Map();

  registerProvider(name: string, provider: MCPProvider): void {
    this.providers.set(name, provider);
    console.log(`[ProviderRegistry] Registered provider: ${name}`);
  }

  getProvider(name: string): MCPProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): Map<string, MCPProvider> {
    return new Map(this.providers);
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  removeProvider(name: string): boolean {
    const removed = this.providers.delete(name);
    if (removed) {
      console.log(`[ProviderRegistry] Removed provider: ${name}`);
    }
    return removed;
  }

  // Get a list of all registered provider names
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  // Get provider count
  getProviderCount(): number {
    return this.providers.size;
  }
}

