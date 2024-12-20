'use client'

import React, { useState, useEffect } from 'react';
import { PlusCircle, Calendar, Clock, Type, Edit2, Save, X, Eye, ArrowLeft, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import 'easymde/dist/easymde.min.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false });

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  content: string;
}

const MoMDashboard = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [currentMeeting, setCurrentMeeting] = useState({
    title: '',
    date: '',
    time: '',
    content: ''
  });
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'meetings'), (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Meeting[];
      setMeetings(meetingsData);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateMeeting = async () => {
    if (currentMeeting.title && currentMeeting.date && currentMeeting.time) {
      try {
        // First close the dialog
        setIsDialogOpen(false);
        
        // Then create the meeting
        const docRef = await addDoc(collection(db, 'meetings'), {
          ...currentMeeting,
          content: ''
        });

        // Reset the form
        setCurrentMeeting({
          title: '',
          date: '',
          time: '',
          content: ''
        });

        // Finally, set the selected meeting and editing mode
        setSelectedMeeting(docRef.id);
        setIsEditing(true);
      } catch (error) {
        console.error("Error creating meeting:", error);
      }
    }
  };

  const handleSaveMeeting = async (meetingId: string, updatedContent: string) => {
    try {
      await updateDoc(doc(db, 'meetings', meetingId), {
        content: updatedContent
      });
    } catch (error) {
      console.error("Error updating meeting:", error);
    }
  };

  const handleUpdateMeeting = async (meetingId: string, updatedMeeting: Partial<Meeting>) => {
    try {
      await updateDoc(doc(db, 'meetings', meetingId), updatedMeeting);
      setEditingMeeting(null);
    } catch (error) {
      console.error("Error updating meeting:", error);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
      setSelectedMeeting(null);
      setIsEditing(false);
      setMeetingToDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }
  };

  const confirmDelete = (meetingId: string) => {
    setMeetingToDelete(meetingId);
    setIsDeleteDialogOpen(true);
  };

  const renderMarkdown = (content: string) => {
    if (!content) return '';
    
    // Parse markdown and sanitize the resulting HTML
    const rawHtml = marked(content, {
      gfm: true,
      breaks: true
    });
    return DOMPurify.sanitize(rawHtml);
  };

  const MeetingViewer = ({ meeting }: { meeting: Meeting | undefined }) => {
    if (!meeting) {
      return (
        <div className="w-full h-full p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                Meeting not found
              </h3>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedMeeting(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-purple-800">
              {meeting.title} - {meeting.date} at {meeting.time}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedMeeting(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete(meeting.id)}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
        <div className="prose prose-purple max-w-none">
          <div 
            dangerouslySetInnerHTML={{ __html: renderMarkdown(meeting.content) }} 
            className="markdown-preview"
          />
        </div>
      </div>
    );
  };

  const MeetingEditor = ({ meeting }: { meeting: Meeting | undefined }) => {
    const [content, setContent] = useState('');
    
    useEffect(() => {
      if (meeting) {
        setContent(meeting.content);
      }
    }, [meeting]);

    if (!meeting) {
      return (
        <div className="w-full h-full p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                Meeting not found
              </h3>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedMeeting(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </div>
        </div>
      );
    }
  
    return (
      <div className="w-full h-full p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-purple-800">
              {meeting.title} - {meeting.date} at {meeting.time}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedMeeting(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> Preview
            </Button>
            <Button
              onClick={() => {
                handleSaveMeeting(meeting.id, content);
                setIsEditing(false);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
        </div>
        <SimpleMDE
          value={content}
          onChange={setContent}
          options={{
            autofocus: true,
            spellChecker: true,
            placeholder: "Type the MoM here...",
            status: false,
            toolbar: [
              "bold",
              "italic",
              "heading",
              "|",
              "quote",
              "unordered-list",
              "ordered-list",
              "|",
              "link",
              "table",
              "|",
              "preview",
              "side-by-side",
              "fullscreen",
              "|",
              "guide",
            ],
          }}
          className="min-h-[500px] prose prose-purple max-w-none"
        />
      </div>
    );
  };

  

  const CardPreview = ({ content }: { content: string }) => (
    <div className="prose prose-sm line-clamp-3">
      <div 
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        className="markdown-preview"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            COSC MoM
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                <PlusCircle className="w-4 h-4" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-to-br from-purple-50 to-pink-50">
              <DialogHeader>
                <DialogTitle className="text-purple-800">Create New Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-purple-700">Meeting Title</Label>
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-purple-500" />
                    <Input
                      id="title"
                      placeholder="Enter meeting title"
                      value={currentMeeting.title}
                      onChange={(e) => setCurrentMeeting({ ...currentMeeting, title: e.target.value })}
                      className="border-purple-200 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-purple-700">Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <Input
                      id="date"
                      type="date"
                      value={currentMeeting.date}
                      onChange={(e) => setCurrentMeeting({ ...currentMeeting, date: e.target.value })}
                      className="border-purple-200 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-purple-700">Time</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <Input
                      id="time"
                      type="time"
                      value={currentMeeting.time}
                      onChange={(e) => setCurrentMeeting({ ...currentMeeting, time: e.target.value })}
                      className="border-purple-200 focus:ring-purple-400 focus:border-purple-400"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  onClick={handleCreateMeeting}
                >
                  Create Minutes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the meeting minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMeetingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => meetingToDelete && handleDeleteMeeting(meetingToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>

        {selectedMeeting ? (
          isEditing ? (
            <MeetingEditor meeting={meetings.find(m => m.id === selectedMeeting)!} />
          ) : (
            <MeetingViewer meeting={meetings.find(m => m.id === selectedMeeting)!} />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map((meeting) => (
              <Card 
                key={meeting.id} 
                className="bg-white/80 backdrop-blur-sm border-purple-200 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedMeeting(meeting.id)}
              >
                <CardHeader>
                  {editingMeeting?.id === meeting.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editingMeeting.title}
                        onChange={(e) => setEditingMeeting({...editingMeeting, title: e.target.value})}
                        className="font-semibold"
                      />
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={editingMeeting.date}
                          onChange={(e) => setEditingMeeting({...editingMeeting, date: e.target.value})}
                        />
                        <Input
                          type="time"
                          value={editingMeeting.time}
                          onChange={(e) => setEditingMeeting({...editingMeeting, time: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-purple-800">{meeting.title}</CardTitle>
                      <CardDescription className="text-purple-600">
                        {meeting.date} at {meeting.time}
                      </CardDescription>
                    </>
                  )}
                </CardHeader>
                <CardContent>
      <CardPreview content={meeting.content} />
    </CardContent>
    <CardFooter className="flex justify-end gap-2">
                  {editingMeeting?.id === meeting.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMeeting(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateMeeting(meeting.id, editingMeeting);
                        }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMeeting(meeting);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(meeting.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoMDashboard;