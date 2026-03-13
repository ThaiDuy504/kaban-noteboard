'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, LayoutGrid, LogOut, Moon, Sun, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { data: session } = useSession();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (!session) return null;

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/boards" className="flex items-center gap-2">
          <span className="text-2xl">✏️</span>
          <span className="font-bold text-xl">jottie</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/notes">
              <FileText className="w-4 h-4 mr-2" />
              notes
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/boards">
              <LayoutGrid className="w-4 h-4 mr-2" />
              board
            </Link>
          </Button>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden sm:flex">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Desktop user dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hidden sm:flex">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {session.user?.name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-muted-foreground">
                {session.user?.email}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t bg-card">
          <div className="px-4 py-3 space-y-1">
            <Link 
              href="/notes" 
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Notes</span>
            </Link>
            <Link 
              href="/boards" 
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutGrid className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Boards</span>
            </Link>
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors w-full text-left"
            >
              {darkMode ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
              <span className="font-medium">{darkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <div className="border-t my-2" />
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {session.user?.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
              </div>
            </div>
            <button 
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors w-full text-left text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
